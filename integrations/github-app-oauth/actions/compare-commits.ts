import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner. Example: "nango-provisioned-apps"'),
        repo: z.string().describe('Repository name. Example: "nango"'),
        base: z.string().describe('Base commit SHA, branch name, or tag. Example: "master"'),
        head: z.string().describe('Head commit SHA, branch name, or tag. Example: "feature-branch"')
    })
    .describe('Input for comparing two commits');

const ProviderCommitSchema = z.object({
    sha: z.string(),
    commit: z.object({
        message: z.string(),
        author: z
            .object({
                name: z.string(),
                email: z.string(),
                date: z.string()
            })
            .optional()
    })
});

const ProviderFileSchema = z.object({
    filename: z.string(),
    status: z.string(),
    additions: z.number(),
    deletions: z.number(),
    changes: z.number(),
    patch: z.string().optional()
});

const ProviderCompareSchema = z.object({
    status: z.enum(['ahead', 'behind', 'identical', 'diverged']),
    ahead_by: z.number(),
    behind_by: z.number(),
    total_commits: z.number(),
    commits: z.array(ProviderCommitSchema),
    files: z.array(ProviderFileSchema)
});

const CommitSchema = z.object({
    sha: z.string().describe('Commit SHA'),
    message: z.string().describe('Commit message'),
    author_name: z.string().optional().describe('Git author name'),
    author_email: z.string().optional().describe('Git author email address'),
    author_date: z.string().optional().describe('Git author date in ISO 8601 format')
});

const FileSchema = z.object({
    filename: z.string().describe('File path'),
    status: z.string().describe('File status such as added, removed, modified, or renamed'),
    additions: z.number().describe('Number of lines added'),
    deletions: z.number().describe('Number of lines deleted'),
    changes: z.number().describe('Total number of lines changed'),
    patch: z.string().optional().describe('Unified diff patch for the file')
});

const OutputSchema = z
    .object({
        status: z.enum(['ahead', 'behind', 'identical', 'diverged']).describe('Comparison status indicating how head relates to base'),
        ahead_by: z.number().describe('Number of commits the head is ahead of the base'),
        behind_by: z.number().describe('Number of commits the head is behind the base'),
        total_commits: z.number().describe('Total number of commits included in the comparison response'),
        commits: z.array(CommitSchema).describe('List of commits between the base and head'),
        files: z.array(FileSchema).describe('List of files that changed between the base and head')
    })
    .describe('Output of commit comparison');

/**
 * @tags: [read]
 * @tagReason: Reads commit and branch comparison data from the GitHub API.
 * @pitfalls: Commits are returned in chronological order (oldest first), opposite to git log, and large comparisons silently truncate to 250 commits and 300 changed files.
 */
const action = createAction({
    description: 'Compare two commits/branches/tags and get the diff, ahead/behind counts, and file list.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.github.com/en/rest/commits/commits#compare-two-commits
        const response = await nango.get({
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/compare/${encodeURIComponent(input.base)}...${encodeURIComponent(input.head)}`,
            retries: 3
        });

        const compare = ProviderCompareSchema.parse(response.data);

        return {
            status: compare.status,
            ahead_by: compare.ahead_by,
            behind_by: compare.behind_by,
            total_commits: compare.total_commits,
            commits: compare.commits.map((commit) => ({
                sha: commit.sha,
                message: commit.commit.message,
                ...(commit.commit.author?.name != null && { author_name: commit.commit.author.name }),
                ...(commit.commit.author?.email != null && { author_email: commit.commit.author.email }),
                ...(commit.commit.author?.date != null && { author_date: commit.commit.author.date })
            })),
            files: compare.files.map((file) => ({
                filename: file.filename,
                status: file.status,
                additions: file.additions,
                deletions: file.deletions,
                changes: file.changes,
                ...(file.patch != null && { patch: file.patch })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
