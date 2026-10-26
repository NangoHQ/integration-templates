import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        q: z.string().min(1).describe('Search keywords and qualifiers, for example "octocat type:user" or "location:london followers:>100".'),
        sort: z.enum(['followers', 'repositories', 'joined']).optional().describe('Field used to sort the results. Defaults to best match when omitted.'),
        order: z.enum(['desc', 'asc']).optional().describe('Sort direction for the selected sort field. Ignored when sort is omitted.'),
        per_page: z.number().int().min(1).max(100).optional().describe('Number of results per page, from 1 to 100. GitHub defaults to 30.'),
        page: z.number().int().min(1).optional().describe('Page number of results to fetch, starting at 1.')
    })
    .describe('Input for searching GitHub user and organization accounts using user-search qualifiers.');

const UserSchema = z.object({
    login: z.string().describe('User or organization login handle.'),
    id: z.number().int().describe('Unique numeric GitHub account ID.'),
    node_id: z.string().optional().describe('Global GraphQL node ID for the account.'),
    avatar_url: z.string().optional().describe('URL of the account avatar image.'),
    html_url: z.string().optional().describe('URL of the account profile page on GitHub.'),
    url: z.string().optional().describe('REST API URL for the account.'),
    type: z.string().describe('Account type, such as "User" or "Organization".'),
    user_view_type: z.string().optional().describe('Profile visibility type reported by GitHub, such as "public" or "private".'),
    site_admin: z.boolean().optional().describe('Whether the account is a GitHub site administrator.'),
    score: z.number().describe('Search relevance score assigned by GitHub.'),
    name: z.string().nullable().optional().describe('Display name of the account, or null when not set.'),
    bio: z.string().nullable().optional().describe('Profile biography, or null when not set.'),
    company: z.string().nullable().optional().describe('Company listed on the profile, or null when not set.'),
    blog: z.string().nullable().optional().describe('Blog or website listed on the profile, or null when not set.'),
    location: z.string().nullable().optional().describe('Location listed on the profile, or null when not set.'),
    email: z.string().nullable().optional().describe('Public email address, or null when not set.'),
    hireable: z.boolean().nullable().optional().describe('Whether the account is marked as available for hire, or null when not set.'),
    public_repos: z.number().int().optional().describe('Number of public repositories owned by the account.'),
    public_gists: z.number().int().optional().describe('Number of public gists owned by the account.'),
    followers: z.number().int().optional().describe('Number of followers the account has.'),
    following: z.number().int().optional().describe('Number of accounts this account follows.'),
    created_at: z.string().optional().describe('ISO 8601 timestamp when the account was created.'),
    updated_at: z.string().optional().describe('ISO 8601 timestamp when the account was last updated.'),
    suspended_at: z.string().nullable().optional().describe('ISO 8601 timestamp when the account was suspended, or null when active.')
});

const ProviderResponseSchema = z.object({
    total_count: z.number().int(),
    incomplete_results: z.boolean(),
    items: z.array(UserSchema)
});

const OutputSchema = z
    .object({
        total_count: z.number().int().describe('Total number of accounts matching the query. GitHub exposes at most 1,000 results.'),
        incomplete_results: z.boolean().describe('True when GitHub timed out and the returned results may be incomplete.'),
        items: z.array(UserSchema).describe('User and organization accounts returned for the requested page.'),
        next_page: z.number().int().optional().describe('Next page number when more results are available; omitted on the last page.')
    })
    .describe('User and organization accounts matching the search query.');

/**
 * @tags: [read]
 * @tagReason: Calls GitHub's user search endpoint, which only reads public account data and never modifies provider state.
 * @pitfalls: Search only returns publicly visible accounts, exposes at most 1,000 results, and may return partial results with incomplete_results set to true when GitHub times out.
 */
const action = createAction({
    description: 'Search GitHub user and organization accounts using user-search qualifiers.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.github.com/en/rest/search/search#search-users
            endpoint: '/search/users',
            params: {
                q: input.q,
                ...(input.sort !== undefined && { sort: input.sort }),
                ...(input.order !== undefined && { order: input.order }),
                ...(input.per_page !== undefined && { per_page: input.per_page }),
                ...(input.page !== undefined && { page: input.page })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const page = input.page ?? 1;
        const perPage = input.per_page ?? 30;
        const maxResults = Math.min(providerResponse.total_count, 1000);
        const hasNextPage = providerResponse.items.length === perPage && page * perPage < maxResults;

        return {
            total_count: providerResponse.total_count,
            incomplete_results: providerResponse.incomplete_results,
            items: providerResponse.items,
            ...(hasNextPage && { next_page: page + 1 })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
