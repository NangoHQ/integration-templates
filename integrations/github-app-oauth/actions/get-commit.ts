import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner username. Example: "octocat"'),
        repo: z.string().describe('Repository name. Example: "hello-world"'),
        ref: z.string().describe('Commit reference. Can be a commit SHA, branch name (heads/BRANCH_NAME), or tag name (tags/TAG_NAME).')
    })
    .describe('Input for fetching a single GitHub commit by owner, repo, and ref.');

const CommitAuthorSchema = z.object({
    name: z.string().nullable().describe('Git author name.'),
    email: z.string().nullable().describe('Git author email address.'),
    date: z.string().nullable().describe('ISO 8601 timestamp of the author date.')
});

const CommitCommitterSchema = z.object({
    name: z.string().nullable().describe('Git committer name.'),
    email: z.string().nullable().describe('Git committer email address.'),
    date: z.string().nullable().describe('ISO 8601 timestamp of the committer date.')
});

const TreeSchema = z.object({
    sha: z.string().describe('SHA of the tree object.'),
    url: z.string().describe('REST API URL for the tree.')
});

const VerificationSchema = z.object({
    verified: z.boolean().describe('Whether GitHub considers the signature verified.'),
    reason: z.string().describe('Reason for the verified status.'),
    signature: z.string().nullable().describe('The extracted signature.'),
    payload: z.string().nullable().describe('The value that was signed.'),
    verified_at: z.string().nullable().describe('ISO 8601 timestamp when GitHub verified the signature.')
});

const CommitDetailSchema = z.object({
    url: z.string().describe('REST API URL for the commit.'),
    author: CommitAuthorSchema.nullable().describe('Git author metadata.'),
    committer: CommitCommitterSchema.nullable().describe('Git committer metadata.'),
    message: z.string().describe('Commit message.'),
    comment_count: z.number().describe('Number of comments on the commit.'),
    tree: TreeSchema.describe('Tree object associated with the commit.'),
    verification: VerificationSchema.describe('Signature verification details.')
});

const GitHubUserSchema = z
    .object({
        login: z.string().describe('GitHub username.'),
        id: z.number().describe('GitHub user ID.'),
        node_id: z.string().describe('Global node ID for the user.'),
        avatar_url: z.string().describe('URL of the user avatar image.'),
        gravatar_id: z.string().nullable().describe('Gravatar ID.'),
        url: z.string().describe('REST API URL for the user.'),
        html_url: z.string().describe('HTML profile URL for the user.'),
        type: z.string().describe('Type of user account (e.g. "User", "Bot").'),
        site_admin: z.boolean().describe('Whether the user is a GitHub site admin.')
    })
    .passthrough();

const ParentSchema = z.object({
    sha: z.string().describe('SHA of the parent commit.'),
    url: z.string().describe('REST API URL of the parent commit.'),
    html_url: z.string().describe('HTML URL of the parent commit.')
});

const StatsSchema = z.object({
    additions: z.number().describe('Total lines added in the commit.'),
    deletions: z.number().describe('Total lines deleted in the commit.'),
    total: z.number().describe('Total lines changed in the commit.')
});

const DiffEntrySchema = z.object({
    sha: z.string().nullable().describe('SHA of the file blob.'),
    filename: z.string().describe('Name of the changed file.'),
    status: z.string().describe('Change status: added, removed, modified, renamed, copied, changed, or unchanged.'),
    additions: z.number().describe('Lines added in this file.'),
    deletions: z.number().describe('Lines deleted in this file.'),
    changes: z.number().describe('Total lines changed in this file.'),
    blob_url: z.string().describe('URL to view the file blob.'),
    raw_url: z.string().describe('URL to the raw file content.'),
    contents_url: z.string().describe('URL to the file contents API.'),
    patch: z.string().optional().describe('Unified diff patch for the file.'),
    previous_filename: z.string().optional().describe('Previous filename if the file was renamed.')
});

const OutputSchema = z
    .object({
        sha: z.string().describe('SHA hash of the commit.'),
        node_id: z.string().describe('Global node ID for the commit.'),
        url: z.string().describe('REST API URL of the commit.'),
        html_url: z.string().describe('HTML URL of the commit on GitHub.'),
        comments_url: z.string().describe('URL for commit comments API.'),
        commit: CommitDetailSchema.describe('Detailed commit metadata.'),
        author: GitHubUserSchema.nullable().describe('GitHub user who authored the commit, or null if not linked.'),
        committer: GitHubUserSchema.nullable().describe('GitHub user who committed the code, or null if not linked.'),
        parents: z.array(ParentSchema).describe('Parent commits in the history.'),
        stats: StatsSchema.optional().describe('Aggregate statistics for the commit.'),
        files: z.array(DiffEntrySchema).optional().describe('Files changed in the commit.')
    })
    .describe('Output containing detailed commit metadata, author, committer, parents, stats, and changed files.');

/**
 * @tags: [read]
 * @tagReason: Reads a single commit from the GitHub API without modifying provider state.
 * @pitfalls: The files list is capped at 300 changed files for large diffs even though stats reflects the full commit.
 */
const action = createAction({
    description: 'Get details of a single commit by sha or ref.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contents:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.github.com/en/rest/commits/commits#get-a-commit
        const response = await nango.get({
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/commits/${encodeURIComponent(input.ref)}`,
            retries: 3
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Commit not found for the given ref.',
                owner: input.owner,
                repo: input.repo,
                ref: input.ref
            });
        }

        const raw = response.data;

        if (!raw || typeof raw !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'GitHub returned an unexpected response body.',
                owner: input.owner,
                repo: input.repo,
                ref: input.ref
            });
        }

        const providerCommit = OutputSchema.parse(raw);

        return providerCommit;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
