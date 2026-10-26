import { z } from 'zod';
import { createAction } from 'nango';

const GitUserSchema = z.object({
    name: z.string().nullable().optional().describe('Name recorded on the Git commit.'),
    email: z.string().nullable().optional().describe('Email address recorded on the Git commit.'),
    date: z.string().nullable().optional().describe('ISO 8601 timestamp recorded on the Git commit.')
});

const SimpleUserSchema = z.object({
    login: z.string().describe('GitHub username of the account. Example: "octocat".'),
    id: z.number().describe('Numeric GitHub account ID.'),
    node_id: z.string().optional().describe('GraphQL node ID of the account.'),
    name: z.string().nullable().optional().describe('Display name of the account, if set.'),
    email: z.string().nullable().optional().describe('Public email address of the account, if set.'),
    avatar_url: z.string().optional().describe('URL of the account avatar image.'),
    html_url: z.string().optional().describe('URL of the account profile page.'),
    type: z.string().optional().describe('Account type, such as "User" or "Organization".'),
    site_admin: z.boolean().optional().describe('Whether the account is a GitHub site administrator.')
});

const RepositorySchema = z.object({
    id: z.number().describe('Numeric repository ID.'),
    node_id: z.string().optional().describe('GraphQL node ID of the repository.'),
    name: z.string().describe('Repository name without the owner. Example: "Hello-World".'),
    full_name: z.string().describe('Repository name including the owner. Example: "octocat/Hello-World".'),
    private: z.boolean().describe('Whether the repository is private.'),
    html_url: z.string().describe('URL of the repository on GitHub.'),
    description: z.string().nullable().optional().describe('Repository description, or null when none is set.'),
    fork: z.boolean().optional().describe('Whether the repository is a fork.'),
    archived: z.boolean().optional().describe('Whether the repository is archived.'),
    default_branch: z.string().optional().describe('Name of the repository default branch. Example: "main".'),
    language: z.string().nullable().optional().describe('Primary language of the repository, or null when undetected.'),
    stargazers_count: z.number().optional().describe('Number of users who starred the repository.'),
    owner: SimpleUserSchema.describe('Owner account of the repository.')
});

const CommitSchema = z.object({
    message: z.string().describe('Full commit message, including the subject and body.'),
    author: GitUserSchema.optional().describe('Git author identity recorded on the commit.'),
    committer: GitUserSchema.nullable().optional().describe('Git committer identity recorded on the commit, or null when unavailable.'),
    comment_count: z.number().optional().describe('Number of comments on the commit.'),
    url: z.string().optional().describe('API URL of the commit.'),
    verification: z
        .object({
            verified: z.boolean().describe('Whether the commit signature was verified.'),
            reason: z.string().describe('Reason describing the verification result.'),
            payload: z.string().nullable().optional().describe('Signed payload, or null when not present.'),
            signature: z.string().nullable().optional().describe('Signature value, or null when not present.'),
            verified_at: z.string().nullable().optional().describe('ISO 8601 verification timestamp, or null when not verified.')
        })
        .optional()
        .describe('Signature verification details for the commit.')
});

const CommitSearchItemSchema = z.object({
    sha: z.string().describe('Commit SHA.'),
    node_id: z.string().optional().describe('GraphQL node ID of the commit search result.'),
    url: z.string().describe('API URL of the commit.'),
    html_url: z.string().describe('URL of the commit on GitHub.'),
    comments_url: z.string().optional().describe('API URL for comments on the commit.'),
    commit: CommitSchema.describe('Git commit details, including message and author identities.'),
    author: SimpleUserSchema.nullable().optional().describe('GitHub account linked as the commit author, or null when not linked.'),
    committer: SimpleUserSchema.nullable().optional().describe('GitHub account linked as the commit committer, or null when not linked.'),
    parents: z
        .array(
            z.object({
                sha: z.string().optional().describe('Parent commit SHA.'),
                url: z.string().optional().describe('API URL of the parent commit.'),
                html_url: z.string().optional().describe('URL of the parent commit on GitHub.')
            })
        )
        .optional()
        .describe('Parent commits of this commit.'),
    repository: RepositorySchema.describe('Repository containing the commit.'),
    score: z.number().describe('Search relevance score assigned by GitHub.')
});

const InputSchema = z
    .object({
        q: z
            .string()
            .regex(/\S/, 'q must contain a search term.')
            .describe(
                'Search query using GitHub commit search qualifiers. Example: "repo:octocat/Hello-World fix" or "author:octocat committer-date:>2024-01-01".'
            ),
        sort: z.enum(['author-date', 'committer-date']).optional().describe('Field to sort results by. Omit for best-match ordering.'),
        order: z.enum(['desc', 'asc']).optional().describe('Sort direction. Ignored unless sort is provided. Example: "desc".'),
        per_page: z.number().int().min(1).max(100).optional().describe('Number of results per page, from 1 to 100. Defaults to 30.'),
        page: z.number().int().min(1).optional().describe('Page number of results to fetch, starting at 1. Defaults to 1.')
    })
    .describe('Search query and pagination options for finding commits with the GitHub commit search API.');

const ProviderSearchResponseSchema = z.object({
    total_count: z.number(),
    incomplete_results: z.boolean(),
    items: z.array(CommitSearchItemSchema)
});

const OutputSchema = z
    .object({
        total_count: z.number().describe('Total number of commits matching the query.'),
        incomplete_results: z.boolean().describe('Whether GitHub timed out before returning all matching commits.'),
        items: z.array(CommitSearchItemSchema).describe('Commits matching the search query on the requested page.'),
        next_page: z.number().int().optional().describe('Page number to request next. Omitted on the last accessible page.')
    })
    .describe('A page of GitHub commit search results.');

function getNextPage(linkHeader: unknown): number | undefined {
    if (typeof linkHeader !== 'string') {
        return undefined;
    }
    const match = linkHeader.match(/<[^>]*[?&]page=(\d+)[^>]*>;\s*rel="next"/);
    return match?.[1] !== undefined ? Number(match[1]) : undefined;
}

/**
 * @tags: [read]
 * @tagReason: Searches and reads commit metadata from GitHub without modifying provider state.
 * @pitfalls: GitHub returns 422 when q contains only scoping qualifiers (repo:, org:, user:, is:), so add search text such as "repo:octocat/Hello-World fix"; author:, committer:, hash:, and date qualifiers work on their own. Search covers the default branch only, caps at 1,000 results, and incomplete_results indicates partial results. order is ignored unless sort is provided.
 */
const action = createAction({
    description: 'Search commits across indexed repositories by message, author, or metadata qualifiers.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contents:read'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.github.com/en/rest/search/search#search-commits
            endpoint: '/search/commits',
            params: {
                q: input.q,
                ...(input.sort !== undefined && { sort: input.sort }),
                ...(input.order !== undefined && { order: input.order }),
                ...(input.per_page !== undefined && { per_page: input.per_page }),
                ...(input.page !== undefined && { page: input.page })
            },
            retries: 3
        });

        const result = ProviderSearchResponseSchema.parse(response.data);
        const nextPage = getNextPage(response.headers?.['link']);

        return {
            total_count: result.total_count,
            incomplete_results: result.incomplete_results,
            items: result.items,
            ...(nextPage !== undefined && { next_page: nextPage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
