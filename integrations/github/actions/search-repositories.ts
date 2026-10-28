import { z } from 'zod';
import { createAction } from 'nango';

const OwnerSchema = z.object({
    login: z.string().describe('The owner login name. Example: "NangoHQ".'),
    id: z.number().int().describe('The unique numeric ID of the owner.'),
    node_id: z.string().describe('The GraphQL node ID of the owner.'),
    avatar_url: z.string().describe('The URL of the owner avatar image.'),
    gravatar_id: z.string().nullable().describe('The owner Gravatar ID, or null when not set.'),
    url: z.string().describe('The API URL for the owner.'),
    html_url: z.string().describe('The GitHub web URL for the owner.'),
    type: z.string().describe('The owner account type. Example: "Organization".'),
    site_admin: z.boolean().describe('Whether the owner is a GitHub site administrator.')
});

const LicenseSchema = z.object({
    key: z.string().describe('The machine-readable license key. Example: "mit".'),
    name: z.string().describe('The human-readable license name. Example: "MIT License".'),
    spdx_id: z.string().nullable().describe('The SPDX license identifier, or null when unavailable.'),
    url: z.string().nullable().describe('The API URL for the license, or null when unavailable.'),
    node_id: z.string().optional().describe('The GraphQL node ID of the license.')
});

const RepositorySchema = z.object({
    id: z.number().int().describe('The unique numeric ID of the repository.'),
    node_id: z.string().describe('The GraphQL node ID of the repository.'),
    name: z.string().describe('The repository name without the owner prefix.'),
    full_name: z.string().describe('The repository name including the owner prefix. Example: "NangoHQ/nango".'),
    private: z.boolean().describe('Whether the repository is private.'),
    owner: OwnerSchema.describe('The account that owns the repository.'),
    html_url: z.string().describe('The GitHub web URL for the repository.'),
    description: z.string().nullable().describe('The repository description, or null when none is set.'),
    fork: z.boolean().describe('Whether the repository is a fork.'),
    url: z.string().describe('The API URL for the repository.'),
    created_at: z.string().describe('The ISO 8601 timestamp when the repository was created.'),
    updated_at: z.string().describe('The ISO 8601 timestamp when the repository was last updated.'),
    pushed_at: z.string().nullable().describe('The ISO 8601 timestamp of the last push, or null when never pushed.'),
    homepage: z.string().nullable().describe('The repository homepage URL, or null when none is set.'),
    size: z.number().int().describe('The repository size in kilobytes.'),
    stargazers_count: z.number().int().describe('The number of users who starred the repository.'),
    watchers_count: z.number().int().describe('The number of users watching the repository.'),
    language: z.string().nullable().describe('The primary programming language, or null when undetected.'),
    forks_count: z.number().int().describe('The number of forks of the repository.'),
    open_issues_count: z.number().int().describe('The number of open issues and pull requests.'),
    topics: z.array(z.string()).optional().describe('The repository topics.'),
    visibility: z.string().optional().describe('The repository visibility. Example: "public".'),
    default_branch: z.string().describe('The default branch name. Example: "main".'),
    archived: z.boolean().describe('Whether the repository is archived.'),
    license: LicenseSchema.nullable().optional().describe('The repository license, or null when no license is detected.'),
    disabled: z.boolean().optional().describe('Whether the repository is disabled.'),
    is_template: z.boolean().optional().describe('Whether the repository is a template repository.'),
    score: z.number().describe('The search relevance score assigned to the repository by GitHub.')
});

const InputSchema = z
    .object({
        q: z
            .string()
            .regex(/\S/, 'q must contain a search term.')
            .describe(
                'Repository search query. Supports GitHub qualifiers such as `language:typescript`, `stars:>100`, `topic:javascript`, `org:NangoHQ`, `user:octocat`, and `fork:only`. Example: "nango".'
            ),
        sort: z
            .enum(['stars', 'forks', 'help-wanted-issues', 'updated'])
            .optional()
            .describe('Field to sort results by. Defaults to GitHub best-match relevance when omitted.'),
        order: z.enum(['asc', 'desc']).optional().describe('Sort direction. Defaults to "desc" when `sort` is provided.'),
        per_page: z.number().int().min(1).max(100).optional().describe('Number of results per page, from 1 to 100. Defaults to 30.'),
        page: z.number().int().min(1).optional().describe('Page number of results to return, starting at 1. Defaults to 1.')
    })
    .describe('Parameters for searching GitHub repositories.');

const ProviderSearchResponseSchema = z.object({
    total_count: z.number().int(),
    incomplete_results: z.boolean(),
    items: z.array(RepositorySchema)
});

const OutputSchema = z
    .object({
        total_count: z.number().int().describe('The total number of repositories matching the search query.'),
        incomplete_results: z.boolean().describe('Whether the search timed out and returned incomplete results.'),
        items: z.array(RepositorySchema).describe('The repositories matching the search query.'),
        next_page: z.number().int().optional().describe('Page number to request next. Omitted on the last accessible page.')
    })
    .describe('A page of GitHub repository search results.');

function getNextPage(linkHeader: unknown): number | undefined {
    if (typeof linkHeader !== 'string') {
        return undefined;
    }
    const match = linkHeader.match(/<[^>]*[?&]page=(\d+)[^>]*>;\s*rel="next"/);
    return match?.[1] !== undefined ? Number(match[1]) : undefined;
}

/**
 * @tags: [read]
 * @tagReason: Queries GitHub's repository search endpoint and only reads provider data.
 * @pitfalls: Only the first 1,000 matching repositories are reachable, GitHub may return `incomplete_results: true` when a query times out, and search has its own stricter rate limit than other GitHub endpoints.
 */
const action = createAction({
    description: "Search public and accessible repositories using GitHub's repository-search qualifiers.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['repo'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.github.com/en/rest/search/search#search-repositories
            endpoint: '/search/repositories',
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
