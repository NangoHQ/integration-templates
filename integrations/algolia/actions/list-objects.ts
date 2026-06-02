import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    indexName: z.string().check(z.describe('Name of the Algolia index to browse. Example: "algolia_movie_sample_dataset"')),
    cursor: z.string().optional().check(z.describe('Pagination cursor from the previous response. Omit for the first page.')),
    query: z.string().optional().check(z.describe('Search query string. Example: "star wars"')),
    filters: z.string().optional().check(z.describe('Browse filters. Example: "genre:Action"')),
    hitsPerPage: z.number().optional().check(z.describe('Number of objects to retrieve per page. Default: 1000. Maximum: 1000.'))
});

const ProviderBrowseResponseSchema = z.object({
    hits: z.array(z.record(z.string(), z.unknown())),
    cursor: z.string().optional(),
    nbHits: z.number().optional(),
    page: z.number().optional(),
    nbPages: z.number().optional(),
    hitsPerPage: z.number().optional(),
    processingTimeMS: z.number().optional(),
    query: z.string().optional(),
    params: z.string().optional()
});

const OutputSchema = z.object({
    hits: z.array(z.record(z.string(), z.unknown())),
    nbHits: z.number().optional(),
    page: z.number().optional(),
    nbPages: z.number().optional(),
    hitsPerPage: z.number().optional(),
    processingTimeMS: z.number().optional(),
    query: z.string().optional(),
    params: z.string().optional(),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List objects from an Algolia index using the browse endpoint.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-objects',
        group: 'Objects'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['browse'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.algolia.com/doc/rest-api/search/#browse-index-get
            endpoint: `/1/indexes/${encodeURIComponent(input.indexName)}/browse`,
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.query !== undefined && { query: input.query }),
                ...(input.filters !== undefined && { filters: input.filters }),
                ...(input.hitsPerPage !== undefined && { hitsPerPage: String(input.hitsPerPage) })
            },
            retries: 3
        });

        const providerData = ProviderBrowseResponseSchema.parse(response.data);

        return {
            hits: providerData.hits,
            ...(providerData.nbHits !== undefined && { nbHits: providerData.nbHits }),
            ...(providerData.page !== undefined && { page: providerData.page }),
            ...(providerData.nbPages !== undefined && { nbPages: providerData.nbPages }),
            ...(providerData.hitsPerPage !== undefined && { hitsPerPage: providerData.hitsPerPage }),
            ...(providerData.processingTimeMS !== undefined && { processingTimeMS: providerData.processingTimeMS }),
            ...(providerData.query !== undefined && { query: providerData.query }),
            ...(providerData.params !== undefined && { params: providerData.params }),
            ...(providerData.cursor !== undefined && { nextCursor: providerData.cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
