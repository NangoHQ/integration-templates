import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    indexName: z.string().describe('Algolia index name. Example: "algolia_movie_sample_dataset"'),
    query: z.string().optional().describe('Optional text query to filter rules.'),
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.'),
    hitsPerPage: z.number().int().min(1).max(1000).optional().describe('Number of rules per page.')
});

const RuleSchema = z
    .object({
        objectID: z.string(),
        description: z.string().optional(),
        enabled: z.boolean().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    hits: z.array(z.record(z.string(), z.unknown())),
    nbHits: z.number().optional(),
    page: z.number().optional(),
    nbPages: z.number().optional(),
    hitsPerPage: z.number().optional()
});

const OutputSchema = z.object({
    hits: z.array(RuleSchema),
    nbHits: z.number().optional(),
    page: z.number().optional(),
    nbPages: z.number().optional(),
    hitsPerPage: z.number().optional(),
    nextPage: z.string().optional().describe('Cursor for the next page. Omit if there are no more pages.')
});

const action = createAction({
    description: 'List query rules from an Algolia index.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-rules',
        group: 'Rules'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['search'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const parsedPage = input.cursor !== undefined ? parseInt(input.cursor, 10) : 0;
        const page = Number.isNaN(parsedPage) ? 0 : parsedPage;

        // https://www.algolia.com/doc/rest-api/search/#search-rules
        const response = await nango.post({
            endpoint: `/1/indexes/${encodeURIComponent(input.indexName)}/rules/search`,
            data: {
                ...(input.query !== undefined && { query: input.query }),
                ...(input.hitsPerPage !== undefined && { hitsPerPage: input.hitsPerPage }),
                page
            },
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        const currentPage = providerData.page ?? 0;
        const totalPages = providerData.nbPages ?? 1;

        const hits = providerData.hits.map((hit) => {
            const rule = RuleSchema.parse(hit);
            return rule;
        });

        return {
            hits,
            ...(providerData.nbHits !== undefined && { nbHits: providerData.nbHits }),
            ...(providerData.page !== undefined && { page: providerData.page }),
            ...(providerData.nbPages !== undefined && { nbPages: providerData.nbPages }),
            ...(providerData.hitsPerPage !== undefined && { hitsPerPage: providerData.hitsPerPage }),
            ...(currentPage + 1 < totalPages && { nextPage: String(currentPage + 1) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
