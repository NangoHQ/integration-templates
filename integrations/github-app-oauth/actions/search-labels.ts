import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        repository_id: z.number().int().positive().describe('Numeric ID of the repository to search labels in. Example: 1224437532'),
        q: z.string().min(1).describe('Search keywords matched against label names and descriptions. Qualifiers are not supported. Example: "bug"'),
        sort: z.enum(['created', 'updated']).optional().describe('Field used to sort the results. Defaults to best match when omitted.'),
        order: z.enum(['asc', 'desc']).optional().describe('Sort direction, applied only when sort is set. Defaults to "desc".'),
        per_page: z.number().int().min(1).max(100).optional().describe('Number of results to return per page, from 1 to 100. Defaults to 30.'),
        page: z.number().int().positive().optional().describe('Page number of results to fetch, starting at 1. Defaults to 1.')
    })
    .describe('Parameters for searching labels in a GitHub repository.');

const ArchivedBySchema = z.object({
    login: z.string().describe('Username of the user who archived the label.'),
    id: z.number().int().describe('Numeric ID of the user who archived the label.'),
    node_id: z.string().describe('GraphQL node ID of the user who archived the label.'),
    avatar_url: z.string().describe('Avatar URL of the user who archived the label.'),
    html_url: z.string().describe('GitHub profile URL of the user who archived the label.')
});

const LabelSchema = z.object({
    id: z.number().int().describe('Numeric ID of the label.'),
    node_id: z.string().describe('GraphQL node ID of the label.'),
    url: z.string().describe('API URL of the label.'),
    name: z.string().describe('Name of the label.'),
    color: z.string().describe('Hex color code of the label without the leading "#".'),
    default: z.boolean().describe('Whether this is a default GitHub label.'),
    description: z.string().nullable().describe('Description of the label, or null when it has none.'),
    archived_at: z.string().nullable().describe('ISO 8601 timestamp when the label was archived, or null when it is not archived.'),
    archived_by: ArchivedBySchema.nullable().describe('User who archived the label, or null when it is not archived.'),
    score: z.number().describe('Relevance score assigned by GitHub search.')
});

const ProviderSearchResponseSchema = z.object({
    total_count: z.number().int(),
    incomplete_results: z.boolean(),
    items: z.array(LabelSchema)
});

const OutputSchema = z
    .object({
        total_count: z.number().int().describe('Total number of labels matching the search query.'),
        incomplete_results: z.boolean().describe('Whether the search timed out and the results may be incomplete.'),
        items: z.array(LabelSchema).describe('Labels matching the search query, ordered by the requested sort.'),
        next_page: z
            .number()
            .int()
            .positive()
            .optional()
            .describe('Page number to request for the next set of results, omitted when there are no more results.')
    })
    .describe('A page of label search results from a GitHub repository.');

/**
 * @tags: [read]
 * @tagReason: Searches and reads label metadata from a repository without modifying provider data.
 * @pitfalls: The q value must be plain keywords because this search rejects qualifiers, repository_id must be the numeric repository ID rather than an owner/name string, only the first 1,000 matches are accessible even when total_count is higher, and incomplete_results=true means the search timed out and returned partial results.
 */
const action = createAction({
    description: 'Search for labels within a specific repository by name or description.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const perPage = input.per_page ?? 30;
        const page = input.page ?? 1;

        // https://docs.github.com/en/rest/search/search#search-labels
        const response = await nango.get({
            endpoint: '/search/labels',
            params: {
                repository_id: input.repository_id,
                q: input.q,
                ...(input.sort !== undefined && { sort: input.sort }),
                ...(input.order !== undefined && { order: input.order }),
                ...(input.per_page !== undefined && { per_page: input.per_page }),
                ...(input.page !== undefined && { page: input.page })
            },
            retries: 3
        });

        const result = ProviderSearchResponseSchema.parse(response.data);
        const accessibleCount = Math.min(result.total_count, 1000);
        const nextPage = page * perPage < accessibleCount ? page + 1 : undefined;

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
