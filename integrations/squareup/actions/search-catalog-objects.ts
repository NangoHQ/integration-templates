import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    object_types: z.array(z.string()).optional().describe('The desired set of object types to appear in the search results. Example: ["ITEM", "CATEGORY"]'),
    include_deleted_objects: z.boolean().optional().describe('If true, deleted objects will be included in the results.'),
    include_related_objects: z
        .boolean()
        .optional()
        .describe('If true, the response will include additional objects that are related to the requested objects.'),
    begin_time: z.string().optional().describe('Return objects modified after this timestamp, in RFC 3339 format.'),
    query: z.object({}).passthrough().optional().describe('A query to be used to filter or sort the results.'),
    limit: z.number().optional().describe('A limit on the number of results to be returned in a single page.'),
    include_category_path_to_root: z
        .boolean()
        .optional()
        .describe('Specifies whether or not to include the path_to_root list for each returned category instance.')
});

const ProviderErrorSchema = z.object({
    category: z.string().optional(),
    code: z.string().optional(),
    detail: z.string().optional(),
    field: z.string().optional()
});

const ProviderResponseSchema = z.object({
    errors: z.array(ProviderErrorSchema).optional(),
    objects: z.array(z.object({}).passthrough()).optional(),
    related_objects: z.array(z.object({}).passthrough()).optional(),
    cursor: z.string().optional(),
    latest_time: z.string().optional()
});

const OutputSchema = z.object({
    objects: z.array(z.object({}).passthrough()),
    related_objects: z.array(z.object({}).passthrough()).optional(),
    cursor: z.string().optional(),
    latest_time: z.string().optional()
});

const action = createAction({
    description: 'Search catalog objects.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ITEMS_READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.squareup.com/reference/square/catalog-api/search-catalog-objects
            endpoint: '/v2/catalog/search',
            data: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.object_types !== undefined && { object_types: input.object_types }),
                ...(input.include_deleted_objects !== undefined && { include_deleted_objects: input.include_deleted_objects }),
                ...(input.include_related_objects !== undefined && { include_related_objects: input.include_related_objects }),
                ...(input.begin_time !== undefined && { begin_time: input.begin_time }),
                ...(input.query !== undefined && { query: input.query }),
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.include_category_path_to_root !== undefined && { include_category_path_to_root: input.include_category_path_to_root })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.errors && providerResponse.errors.length > 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.errors.map((error) => error.detail || error.code || 'Unknown error').join(', '),
                errors: providerResponse.errors
            });
        }

        return {
            objects: providerResponse.objects ?? [],
            ...(providerResponse.related_objects !== undefined && { related_objects: providerResponse.related_objects }),
            ...(providerResponse.cursor !== undefined && { cursor: providerResponse.cursor }),
            ...(providerResponse.latest_time !== undefined && { latest_time: providerResponse.latest_time })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
