import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    indexName: z.string().describe('Algolia index name. Example: "algolia_movie_sample_dataset"'),
    query: z.string().optional().describe('Optional search query for filtering synonyms.'),
    hitsPerPage: z.number().int().min(1).max(1000).optional().describe('Number of synonyms to return per page. Default: 20'),
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.')
});

const SynonymSchema = z
    .object({
        objectID: z.string(),
        type: z.string(),
        synonyms: z.array(z.string()).optional(),
        input: z.string().optional(),
        word: z.string().optional(),
        corrections: z.array(z.string()).optional(),
        placeholder: z.string().optional(),
        replacements: z.array(z.string()).optional()
    })
    .passthrough();

const OutputSchema = z.object({
    synonyms: z.array(SynonymSchema),
    nbHits: z.number(),
    nextPage: z.string().optional()
});

const action = createAction({
    description: 'List synonyms from an Algolia index.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-synonyms',
        group: 'Synonyms'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        const page = input['cursor'] ? parseInt(input['cursor'], 10) : 0;
        if (Number.isNaN(page) || page < 0) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a non-negative integer string'
            });
        }

        const hitsPerPage = input['hitsPerPage'] ?? 20;

        const requestBody: Record<string, unknown> = {
            page,
            hitsPerPage
        };

        if (input['query'] !== undefined && input['query'].length > 0) {
            requestBody['query'] = input['query'];
        }

        const response = await nango.post({
            // https://www.algolia.com/doc/rest-api/search/#search-synonyms-1
            endpoint: `/1/indexes/${encodeURIComponent(input['indexName'])}/synonyms/search`,
            data: requestBody,
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            hits: z.array(z.unknown()),
            nbHits: z.number()
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const synonyms = providerResponse.hits.map((hit) => {
            const parsed = SynonymSchema.parse(hit);
            return parsed;
        });

        const nextPage = (page + 1) * hitsPerPage < providerResponse.nbHits ? String(page + 1) : undefined;

        return {
            synonyms,
            nbHits: providerResponse.nbHits,
            ...(nextPage !== undefined && { nextPage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
