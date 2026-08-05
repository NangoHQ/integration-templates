import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    catalog_uuid: z.string().optional().describe('Catalog UUID to filter collections. Example: "6e228160-a9cc-4407-bfa9-464972545fdd"'),
    include_all_catalogs: z.boolean().optional().describe('Whether to include collections from all catalogs.')
});

const ProviderCollectionSchema = z.object({
    uuid: z.string(),
    name: z.string(),
    mockup_count: z.number(),
    created_at: z.string(),
    updated_at: z.string(),
    created_at_timestamp: z.number(),
    updated_at_timestamp: z.number()
});

const OutputSchema = z.object({
    data: z.array(ProviderCollectionSchema)
});

const action = createAction({
    description: 'List collections (named groupings of mockups, e.g. for bulk/collection rendering) in this account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.dynamicmockups.com/api-reference/collections/list-collections
        const response = await nango.get({
            endpoint: '/v1/collections',
            params: {
                ...(input.catalog_uuid !== undefined && { catalog_uuid: input.catalog_uuid }),
                ...(input.include_all_catalogs !== undefined && { include_all_catalogs: String(input.include_all_catalogs) })
            },
            retries: 3
        });

        const providerData = z
            .object({
                data: z.array(z.unknown()),
                success: z.boolean().optional(),
                message: z.string().optional()
            })
            .parse(response.data);

        if (providerData.success === false) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerData.message
            });
        }

        const data = providerData.data.map((item: unknown) => {
            const collection = ProviderCollectionSchema.parse(item);
            return {
                uuid: collection.uuid,
                name: collection.name,
                mockup_count: collection.mockup_count,
                created_at: collection.created_at,
                updated_at: collection.updated_at,
                created_at_timestamp: collection.created_at_timestamp,
                updated_at_timestamp: collection.updated_at_timestamp
            };
        });

        return { data };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
