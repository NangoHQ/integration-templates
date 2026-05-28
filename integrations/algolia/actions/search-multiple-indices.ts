import { z } from 'zod';
import { createAction } from 'nango';

const SearchRequestSchema = z.object({
    indexName: z.string().describe('Name of the index to search. Example: "algolia_movie_sample_dataset"'),
    params: z.string().optional().describe('URL-encoded search parameters string. Example: "query=star&hitsPerPage=3"')
});

const InputSchema = z.object({
    requests: z
        .array(SearchRequestSchema)
        .min(1, 'At least one search request is required.')
        .max(50, 'Maximum 50 search requests per call.')
        .describe('Array of search requests, one per index or query. Maximum 50 requests.'),
    strategy: z.string().optional().describe('Multi-query search strategy. Example: "stopIfEnoughMatches"')
});

const HitSchema = z
    .object({
        objectID: z.string()
    })
    .passthrough();

const SearchResultSchema = z
    .object({
        hits: z.array(HitSchema),
        page: z.number().optional(),
        nbHits: z.number().optional(),
        nbPages: z.number().optional(),
        hitsPerPage: z.number().optional(),
        query: z.string().optional(),
        params: z.string().optional(),
        processingTimeMS: z.number().optional(),
        index: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    results: z.array(SearchResultSchema).describe('Search results in the same order as the requests.')
});

const action = createAction({
    description: 'Run search queries across multiple Algolia indices in a single request.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/search-multiple-indices',
        group: 'Search'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['search'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://www.algolia.com/doc/rest-api/search/#search-multiple-indices
            endpoint: '/1/indexes/*/queries',
            data: {
                requests: input.requests.map((req) => ({
                    indexName: req.indexName,
                    ...(req.params !== undefined && { params: req.params })
                })),
                ...(input.strategy !== undefined && { strategy: input.strategy })
            },
            retries: 3
        });

        const raw = response.data;

        if (raw == null || typeof raw !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Algolia search API'
            });
        }

        const providerResponse = z
            .object({
                results: z.array(z.unknown())
            })
            .parse(raw);

        const results = providerResponse.results.map((result) => {
            return SearchResultSchema.parse(result);
        });

        return {
            results
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
