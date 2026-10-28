import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        q: z
            .string()
            .regex(/\S/, 'q must contain a search term.')
            .describe('Code search query with keywords and GitHub qualifiers. Example: "addClass in:file language:js repo:jquery/jquery".'),
        sort: z
            .enum(['indexed'])
            .optional()
            .describe('Sort order for results. The only supported value is "indexed", which sorts by how recently GitHub indexed the file.'),
        order: z.enum(['desc', 'asc']).optional().describe('Direction of the sort. Only applies when sort is provided.'),
        per_page: z.number().int().min(1).max(100).optional().describe('Number of results to return per page, from 1 to 100. GitHub defaults to 30.'),
        page: z.number().int().min(1).optional().describe('Page number of results to return, starting at 1. GitHub defaults to 1.')
    })
    .describe('Parameters for searching code across GitHub repositories.');

const RepositoryOwnerSchema = z.object({
    login: z.string().describe('Username of the repository owner.'),
    id: z.number().int().describe('Numeric GitHub user ID of the repository owner.'),
    avatar_url: z.string().describe('URL of the repository owner avatar image.'),
    html_url: z.string().describe('Web URL of the repository owner profile.')
});

const RepositorySchema = z.object({
    id: z.number().int().describe('Numeric GitHub repository ID.'),
    node_id: z.string().describe('GraphQL node ID of the repository.'),
    name: z.string().describe('Repository name without the owner prefix.'),
    full_name: z.string().describe('Repository name including the owner, for example "jquery/jquery".'),
    private: z.boolean().describe('Whether the repository is private.'),
    html_url: z.string().describe('Web URL of the repository.'),
    description: z.string().nullable().describe('Repository description, or null when none is set.'),
    fork: z.boolean().describe('Whether the repository is a fork.'),
    owner: RepositoryOwnerSchema.describe('Owner of the repository.')
});

const CodeSearchItemSchema = z.object({
    name: z.string().describe('File name of the matching code file.'),
    path: z.string().describe('Full path of the file within the repository.'),
    sha: z.string().describe('Git blob SHA of the matching file.'),
    url: z.string().describe('API URL of the matching file.'),
    html_url: z.string().describe('Web URL of the matching file.'),
    git_url: z.string().describe('Git API URL of the matching blob.'),
    repository: RepositorySchema.describe('Repository that contains the matching file.'),
    score: z.number().describe('Relevance score assigned by GitHub search.'),
    file_size: z.number().int().optional().describe('Size of the file in bytes.'),
    language: z.string().nullable().optional().describe('Detected programming language of the file, or null when GitHub cannot detect one.'),
    last_modified_at: z.string().optional().describe('Timestamp when the file was last modified.'),
    line_numbers: z.array(z.string()).optional().describe('Line numbers of the match when GitHub includes them.')
});

const ProviderSearchResponseSchema = z.object({
    total_count: z.number().int(),
    incomplete_results: z.boolean(),
    items: z.array(CodeSearchItemSchema)
});

const OutputSchema = z
    .object({
        total_count: z.number().int().describe('Total number of matching files, up to the GitHub search result cap.'),
        incomplete_results: z.boolean().describe('Whether the search timed out before returning all possible matches.'),
        items: z.array(CodeSearchItemSchema).describe('Matching code files for the requested page.'),
        next_page: z.number().int().optional().describe('Page number to request next. Omitted on the last accessible page.')
    })
    .describe('A page of GitHub code search results.');

function getNextPage(linkHeader: unknown): number | undefined {
    if (typeof linkHeader !== 'string') {
        return undefined;
    }
    const match = linkHeader.match(/<[^>]*[?&]page=(\d+)[^>]*>;\s*rel="next"/);
    return match?.[1] !== undefined ? Number(match[1]) : undefined;
}

/**
 * @tags: [read]
 * @tagReason: Reads code search results from GitHub without modifying any repository data.
 * @pitfalls: Code search only indexes default-branch files under 384 KB, requires at least one search term (qualifiers alone are not enough), caps matches at 1,000, and is limited to 10 requests per minute; without a repo:, org:, or user: qualifier it searches all public code GitHub has indexed. incomplete_results=true means the query timed out and results may be partial.
 */
const action = createAction({
    description: 'Search file contents across indexed GitHub repositories using code-search qualifiers.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['repo'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.github.com/en/rest/search/search#search-code
            endpoint: '/search/code',
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
