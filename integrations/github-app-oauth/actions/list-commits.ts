import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('The account owner of the repository. The name is not case sensitive.'),
        repo: z.string().describe('The name of the repository without the .git extension. The name is not case sensitive.'),
        sha: z.string().optional().describe("SHA or branch to start listing commits from. Default: the repository's default branch."),
        path: z.string().optional().describe('Only commits containing this file path will be returned.'),
        since: z.string().optional().describe('Only show results that were last updated after the given time. ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ.'),
        until: z.string().optional().describe('Only commits before this date will be returned. ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ.'),
        per_page: z.number().optional().describe('The number of results per page (max 100). Default: 30.'),
        cursor: z.string().optional().describe('Pagination cursor from the previous response. Maps to the page number. Omit for the first page.')
    })
    .describe('Input for listing commits from a GitHub repository.');

const GitUserSchema = z.object({
    name: z.string().describe('The name of the Git author or committer.'),
    email: z.string().describe('The email of the Git author or committer.'),
    date: z.string().describe('The date of the commit in ISO 8601 format.')
});

const TreeSchema = z.object({
    sha: z.string().describe('The SHA of the tree object.'),
    url: z.string().describe('The API URL of the tree object.')
});

const VerificationSchema = z.object({
    verified: z.boolean().describe('Whether GitHub considers the commit signature to be verified.'),
    reason: z.string().describe('The reason for the verified value. For example, "valid" or "unsigned".'),
    signature: z.string().nullable().optional().describe('The signature that was extracted from the commit.'),
    payload: z.string().nullable().optional().describe('The value that was signed.'),
    verified_at: z.string().nullable().optional().describe('The date the signature was verified by GitHub.')
});

const CommitDetailsSchema = z.object({
    url: z.string().describe('The API URL of the commit details.'),
    author: GitUserSchema.nullable().describe('The Git author of the commit.'),
    committer: GitUserSchema.nullable().describe('The Git committer of the commit.'),
    message: z.string().describe('The commit message.'),
    comment_count: z.number().describe('The number of comments on the commit.'),
    tree: TreeSchema.describe('The tree object associated with the commit.'),
    verification: VerificationSchema.describe('The signature verification status of the commit.')
});

const SimpleUserSchema = z.object({
    login: z.string().describe('The login username of the GitHub user.'),
    id: z.number().describe('The unique identifier of the GitHub user.'),
    avatar_url: z.string().describe("The URL of the user's avatar image."),
    html_url: z.string().describe("The URL of the user's GitHub profile."),
    type: z.string().describe('The type of user. For example, "User" or "Bot".')
});

const ParentSchema = z.object({
    sha: z.string().describe('The SHA of the parent commit.'),
    url: z.string().describe('The API URL of the parent commit.'),
    html_url: z.string().optional().describe('The HTML URL of the parent commit.')
});

const CommitSchema = z.object({
    url: z.string().describe('The API URL of the commit.'),
    sha: z.string().describe('The SHA hash of the commit.'),
    node_id: z.string().describe('The node ID of the commit.'),
    html_url: z.string().describe('The HTML URL of the commit.'),
    comments_url: z.string().describe('The API URL for comments on the commit.'),
    commit: CommitDetailsSchema.describe('Detailed commit metadata including message, author, and verification.'),
    author: SimpleUserSchema.nullable().describe('The GitHub user who authored the commit.'),
    committer: SimpleUserSchema.nullable().describe('The GitHub user who committed the commit.'),
    parents: z.array(ParentSchema).describe('The parent commits of this commit.')
});

const OutputSchema = z
    .object({
        commits: z.array(CommitSchema).describe('The list of commits returned for the requested repository.'),
        next_cursor: z.string().optional().describe('Pagination cursor for the next page of results. Maps to the next page number.')
    })
    .describe('Output for listing commits from a GitHub repository.');

const ProviderCommitSchema = z.object({
    url: z.string(),
    sha: z.string(),
    node_id: z.string(),
    html_url: z.string(),
    comments_url: z.string(),
    commit: z.object({
        url: z.string(),
        author: z
            .object({
                name: z.string(),
                email: z.string(),
                date: z.string()
            })
            .nullable(),
        committer: z
            .object({
                name: z.string(),
                email: z.string(),
                date: z.string()
            })
            .nullable(),
        message: z.string(),
        comment_count: z.number(),
        tree: z.object({
            sha: z.string(),
            url: z.string()
        }),
        verification: z.object({
            verified: z.boolean(),
            reason: z.string(),
            signature: z.string().nullable().optional(),
            payload: z.string().nullable().optional(),
            verified_at: z.string().nullable().optional()
        })
    }),
    author: z.unknown(),
    committer: z.unknown(),
    parents: z.array(
        z.object({
            sha: z.string(),
            url: z.string(),
            html_url: z.string().optional()
        })
    )
});

/**
 * @tags: [read]
 * @tagReason: Reads commit history from a GitHub repository.
 * @pitfalls: Top-level author and committer may be null or empty objects when the Git identity does not map to a GitHub user. The sha parameter accepts branch names and tags in addition to commit SHAs. since and until timestamps must be between 1970-01-01 and 2099-12-31 or unexpected results may occur.
 */
const action = createAction({
    description: 'List commits on a branch or overall.',
    version: '1.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contents:read'],

    exec: async (nango, input) => {
        const perPage = input.per_page ?? 30;
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;

        if (Number.isNaN(page)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a valid page number.'
            });
        }

        const config: Omit<ProxyConfiguration, 'method'> = {
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/commits`,
            params: {
                ...(input.sha !== undefined && { sha: input.sha }),
                ...(input.path !== undefined && { path: input.path }),
                ...(input.since !== undefined && { since: input.since }),
                ...(input.until !== undefined && { until: input.until }),
                per_page: String(perPage),
                page: String(page)
            },
            retries: 3
        };

        // https://docs.github.com/en/rest/commits/commits?apiVersion=2022-11-28#list-commits
        const response = await nango.get(config);

        const providerCommits = z.array(ProviderCommitSchema).parse(response.data);
        const nextCursor = providerCommits.length === perPage ? String(page + 1) : undefined;

        const commits = providerCommits.map((commit) => {
            const authorResult = SimpleUserSchema.nullable().safeParse(commit.author);
            const committerResult = SimpleUserSchema.nullable().safeParse(commit.committer);

            return {
                url: commit.url,
                sha: commit.sha,
                node_id: commit.node_id,
                html_url: commit.html_url,
                comments_url: commit.comments_url,
                commit: commit.commit,
                author: authorResult.success ? authorResult.data : null,
                committer: committerResult.success ? committerResult.data : null,
                parents: commit.parents
            };
        });

        return {
            commits,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
