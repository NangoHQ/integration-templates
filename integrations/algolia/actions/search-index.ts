import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    indexName: z.string().describe('Name of the index to search. Example: "algolia_movie_sample_dataset"'),
    query: z.string().optional().describe('Search query string. Example: "star wars"'),
    page: z.number().int().optional().describe('Page number to retrieve. Example: 0'),
    hitsPerPage: z.number().int().optional().describe('Number of hits per page. Example: 20'),
    filters: z.string().optional().describe('Filter expression. Example: "genre:Action"'),
    attributesToRetrieve: z.array(z.string()).optional().describe('Attributes to include in the response. Example: ["title","year"]'),
    facets: z.array(z.string()).optional().describe('Facets for which to retrieve counts. Example: ["genre"]'),
    attributesToHighlight: z.array(z.string()).optional(),
    attributesToSnippet: z.array(z.string()).optional(),
    highlightPreTag: z.string().optional(),
    highlightPostTag: z.string().optional(),
    analytics: z.boolean().optional(),
    clickAnalytics: z.boolean().optional()
});

const HitSchema = z.record(z.string(), z.unknown());

const FacetStatsSchema = z.object({
    avg: z.number(),
    max: z.number(),
    min: z.number(),
    sum: z.number()
});

const OutputSchema = z.object({
    hits: z.array(HitSchema),
    page: z.number().optional(),
    nbHits: z.number().optional(),
    nbPages: z.number().optional(),
    hitsPerPage: z.number().optional(),
    query: z.string().optional(),
    params: z.string().optional(),
    processingTimeMS: z.number().optional(),
    facets: z.record(z.string(), z.record(z.string(), z.number())).optional(),
    facets_stats: z.record(z.string(), FacetStatsSchema).optional()
});

const action = createAction({
    description: 'Run an Algolia search query against an index.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['search'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.algolia.com/doc/rest-api/search/#search-an-index
        const response = await nango.post({
            endpoint: '/1/indexes/' + encodeURIComponent(input.indexName) + '/query',
            data: {
                ...(input.query !== undefined && { query: input.query }),
                ...(input.page !== undefined && { page: input.page }),
                ...(input.hitsPerPage !== undefined && { hitsPerPage: input.hitsPerPage }),
                ...(input.filters !== undefined && { filters: input.filters }),
                ...(input.attributesToRetrieve !== undefined && { attributesToRetrieve: input.attributesToRetrieve }),
                ...(input.facets !== undefined && { facets: input.facets }),
                ...(input.attributesToHighlight !== undefined && { attributesToHighlight: input.attributesToHighlight }),
                ...(input.attributesToSnippet !== undefined && { attributesToSnippet: input.attributesToSnippet }),
                ...(input.highlightPreTag !== undefined && { highlightPreTag: input.highlightPreTag }),
                ...(input.highlightPostTag !== undefined && { highlightPostTag: input.highlightPostTag }),
                ...(input.analytics !== undefined && { analytics: input.analytics }),
                ...(input.clickAnalytics !== undefined && { clickAnalytics: input.clickAnalytics })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Empty response from Algolia search API'
            });
        }

        const ProviderResponseSchema = z.object({
            hits: z.array(z.record(z.string(), z.unknown())),
            page: z.number().optional(),
            nbHits: z.number().optional(),
            nbPages: z.number().optional(),
            hitsPerPage: z.number().optional(),
            query: z.string().optional(),
            params: z.string().optional(),
            processingTimeMS: z.number().optional(),
            facets: z.record(z.string(), z.record(z.string(), z.number())).optional(),
            facets_stats: z.record(z.string(), FacetStatsSchema).optional()
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            hits: providerResponse.hits,
            ...(providerResponse.page !== undefined && { page: providerResponse.page }),
            ...(providerResponse.nbHits !== undefined && { nbHits: providerResponse.nbHits }),
            ...(providerResponse.nbPages !== undefined && { nbPages: providerResponse.nbPages }),
            ...(providerResponse.hitsPerPage !== undefined && { hitsPerPage: providerResponse.hitsPerPage }),
            ...(providerResponse.query !== undefined && { query: providerResponse.query }),
            ...(providerResponse.params !== undefined && { params: providerResponse.params }),
            ...(providerResponse.processingTimeMS !== undefined && { processingTimeMS: providerResponse.processingTimeMS }),
            ...(providerResponse.facets !== undefined && { facets: providerResponse.facets }),
            ...(providerResponse.facets_stats !== undefined && { facets_stats: providerResponse.facets_stats })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
