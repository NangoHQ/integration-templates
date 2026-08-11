import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner login. Example: "nango-provisioned-apps"'),
        repo: z.string().describe('Repository name. Example: "nango"'),
        ref: z.string().describe('Commit reference (SHA, branch name, or tag name). Example: "master"')
    })
    .describe('Input for retrieving a single commit by reference');

const GitUserSchema = z.object({
    name: z.string().optional().describe('Git author or committer name'),
    email: z.string().optional().describe('Git author or committer email'),
    date: z.string().optional().describe('Git author or committer timestamp')
});

const VerificationSchema = z.object({
    verified: z.boolean().describe('Whether GitHub considers the commit signature verified'),
    reason: z.string().describe('Reason for the verified value'),
    payload: z.string().nullable().optional().describe('The value that was signed'),
    signature: z.string().nullable().optional().describe('The signature extracted from the commit'),
    verified_at: z.string().nullable().optional().describe('Timestamp when the signature was verified')
});

const TreeSchema = z.object({
    sha: z.string().describe('Tree SHA'),
    url: z.string().describe('Tree API URL')
});

const CommitDetailSchema = z.object({
    url: z.string().describe('Commit API URL'),
    author: GitUserSchema.nullable().optional().describe('Git author metadata'),
    committer: GitUserSchema.nullable().optional().describe('Git committer metadata'),
    message: z.string().describe('Commit message'),
    comment_count: z.number().describe('Number of comments on the commit'),
    tree: TreeSchema.describe('Tree reference'),
    verification: VerificationSchema.optional().describe('Signature verification result')
});

const SimpleUserSchema = z.object({
    login: z.string().describe('GitHub username'),
    id: z.number().describe('GitHub user ID'),
    node_id: z.string().describe('GitHub node ID'),
    avatar_url: z.string().describe('Avatar image URL'),
    html_url: z.string().describe('GitHub profile URL'),
    type: z.string().describe('User type such as User or Bot')
});

const ParentSchema = z.object({
    sha: z.string().describe('Parent commit SHA'),
    url: z.string().describe('Parent commit API URL'),
    html_url: z.string().optional().describe('Parent commit HTML URL')
});

const StatsSchema = z.object({
    additions: z.number().optional().describe('Lines added'),
    deletions: z.number().optional().describe('Lines deleted'),
    total: z.number().optional().describe('Total line changes')
});

const FileSchema = z.object({
    sha: z.string().nullable().optional().describe('File blob SHA'),
    filename: z.string().describe('File path'),
    status: z.string().describe('Change status such as added, removed, modified, or renamed'),
    additions: z.number().describe('Lines added in this file'),
    deletions: z.number().describe('Lines deleted in this file'),
    changes: z.number().describe('Total line changes in this file'),
    blob_url: z.string().describe('Blob URL'),
    raw_url: z.string().describe('Raw content URL'),
    contents_url: z.string().describe('Contents API URL'),
    patch: z.string().optional().describe('File diff patch text'),
    previous_filename: z.string().optional().describe('Previous filename if the file was renamed')
});

const OutputSchema = z
    .object({
        sha: z.string().describe('Commit SHA'),
        node_id: z.string().describe('GitHub node ID'),
        html_url: z.string().describe('Commit HTML URL'),
        url: z.string().describe('Commit API URL'),
        commit: CommitDetailSchema.describe('Git commit metadata'),
        author: SimpleUserSchema.nullable().optional().describe('GitHub author user account'),
        committer: SimpleUserSchema.nullable().optional().describe('GitHub committer user account'),
        parents: z.array(ParentSchema).describe('Parent commits'),
        stats: StatsSchema.optional().describe('Change statistics'),
        files: z.array(FileSchema).optional().describe('Changed files with diff details')
    })
    .describe('Output containing details of a single commit');

/**
 * @tags: [read]
 * @tagReason: Reads commit metadata, author information, and changed files from the GitHub API.
 * @pitfalls: Commits with more than 300 changed files return only the first 300 items in `files`; additional files require following link headers up to a 3000-file limit.
 */
const action = createAction({
    description: 'Get details of a single commit by sha or ref',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['metadata:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.github.com/en/rest/commits/commits?apiVersion=2022-11-28#get-a-commit
        const response = await nango.get({
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/commits/${encodeURIComponent(input.ref)}`,
            retries: 3
        });

        const raw = response.data;

        if (!raw || typeof raw !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'GitHub returned an unexpected response body'
            });
        }

        const providerCommit = z
            .object({
                sha: z.string(),
                node_id: z.string(),
                html_url: z.string(),
                url: z.string(),
                commit: z.object({
                    url: z.string(),
                    author: GitUserSchema.nullable().optional(),
                    committer: GitUserSchema.nullable().optional(),
                    message: z.string(),
                    comment_count: z.number(),
                    tree: TreeSchema,
                    verification: VerificationSchema.optional()
                }),
                author: z.unknown().optional(),
                committer: z.unknown().optional(),
                parents: z.array(ParentSchema),
                stats: StatsSchema.optional(),
                files: z.array(FileSchema).optional()
            })
            .parse(raw);

        const mapUser = (value: unknown) => {
            const parsed = SimpleUserSchema.safeParse(value);
            if (parsed.success) {
                return parsed.data;
            }
            return undefined;
        };

        return {
            sha: providerCommit.sha,
            node_id: providerCommit.node_id,
            html_url: providerCommit.html_url,
            url: providerCommit.url,
            commit: providerCommit.commit,
            author: mapUser(providerCommit.author),
            committer: mapUser(providerCommit.committer),
            parents: providerCommit.parents,
            stats: providerCommit.stats,
            files: providerCommit.files
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
