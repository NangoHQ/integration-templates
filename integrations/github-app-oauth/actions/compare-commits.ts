import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner login. Example: "octocat"'),
        repo: z.string().describe('Repository name. Example: "Hello-World"'),
        base: z.string().describe('Base commit, branch, or tag to compare from. Example: "main" or "v1.0.0" or a full SHA.'),
        head: z.string().describe('Head commit, branch, or tag to compare to. Example: "feature-branch" or a full SHA.')
    })
    .describe('Input parameters for comparing two commits, branches, or tags in a GitHub repository.');

const ProviderCommitAuthorSchema = z.object({
    name: z.string().optional(),
    email: z.string().optional(),
    date: z.string().optional()
});

const ProviderCommitSchema = z.object({
    sha: z.string(),
    commit: z.object({
        message: z.string(),
        author: ProviderCommitAuthorSchema.optional(),
        committer: ProviderCommitAuthorSchema.optional()
    }),
    html_url: z.string().optional()
});

const ProviderFileSchema = z.object({
    sha: z.string(),
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

const CommitAuthorOutputSchema = z
    .object({
        name: z.string().optional().describe('Author name from the commit metadata.'),
        email: z.string().optional().describe('Author email from the commit metadata.'),
        date: z.string().optional().describe('Author date in ISO 8601 format.')
    })
    .describe('Git commit author or committer metadata.');

const CommitOutputSchema = z
    .object({
        sha: z.string().describe('SHA of the commit.'),
        message: z.string().describe('Commit message.'),
        author: CommitAuthorOutputSchema.optional().describe('Author metadata for the commit.'),
        committer: CommitAuthorOutputSchema.optional().describe('Committer metadata for the commit.'),
        html_url: z.string().optional().describe('URL to view the commit on GitHub.')
    })
    .describe('A commit included in the comparison range.');

const FileOutputSchema = z
    .object({
        sha: z.string().describe('SHA of the file blob.'),
        filename: z.string().describe('Path of the changed file.'),
        status: z.string().describe('Change status, e.g. "added", "removed", "modified", "renamed"'),
        additions: z.number().describe('Number of lines added.'),
        deletions: z.number().describe('Number of lines deleted.'),
        changes: z.number().describe('Total number of changed lines.'),
        patch: z.string().optional().describe('Unified diff patch for the file, if available.')
    })
    .describe('A file changed between the two compared refs.');

const OutputSchema = z
    .object({
        status: z.enum(['ahead', 'behind', 'identical', 'diverged']).describe('Comparison status between the two refs.'),
        ahead_by: z.number().describe('Number of commits the head ref is ahead of the base ref.'),
        behind_by: z.number().describe('Number of commits the head ref is behind the base ref.'),
        total_commits: z.number().describe('Total number of commits in the comparison.'),
        commits: z.array(CommitOutputSchema).describe('List of commits between base and head.'),
        files: z.array(FileOutputSchema).describe('List of changed files between base and head.')
    })
    .describe('Result of comparing two commits, branches, or tags in a GitHub repository.');

/**
 * @tags: [read]
 * @tagReason: Calls a read-only GitHub comparison endpoint that does not mutate repository state.
 * @pitfalls: The comparison follows git log BASE..HEAD semantics, so diverged comparisons only include commits ahead on head and omit the behind side; responses are limited to 250 commits and 300 changed files, and binary files omit the patch field.
 */
const action = createAction({
    description: 'Compare two commits/branches/tags and get the diff, ahead/behind counts, and file list.',
    version: '1.0.3',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contents:read'],

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
                ...(commit.commit.author !== undefined && {
                    author: {
                        ...(commit.commit.author.name !== undefined && { name: commit.commit.author.name }),
                        ...(commit.commit.author.email !== undefined && { email: commit.commit.author.email }),
                        ...(commit.commit.author.date !== undefined && { date: commit.commit.author.date })
                    }
                }),
                ...(commit.commit.committer !== undefined && {
                    committer: {
                        ...(commit.commit.committer.name !== undefined && { name: commit.commit.committer.name }),
                        ...(commit.commit.committer.email !== undefined && { email: commit.commit.committer.email }),
                        ...(commit.commit.committer.date !== undefined && { date: commit.commit.committer.date })
                    }
                }),
                ...(commit.html_url !== undefined && { html_url: commit.html_url })
            })),
            files: compare.files.map((file) => ({
                sha: file.sha,
                filename: file.filename,
                status: file.status,
                additions: file.additions,
                deletions: file.deletions,
                changes: file.changes,
                ...(file.patch !== undefined && { patch: file.patch })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
