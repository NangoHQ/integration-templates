import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Collection name. Example: "Summer Campaign"'),
    catalog_uuid: z.string().nullable().optional().describe("Catalog UUID to associate the collection with. Omit to use the account's default catalog.")
});

const ProviderCollectionSchema = z.object({
    id: z.number(),
    uuid: z.string(),
    workspace_id: z.number(),
    catalog_id: z.number(),
    name: z.string(),
    slug: z.string(),
    is_published: z.number(),
    created_at: z.string(),
    updated_at: z.string()
});

const OutputSchema = ProviderCollectionSchema;

const action = createAction({
    description: 'Create a new collection to group mockups for bulk/collection-based rendering.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: { name: string; catalog_uuid?: string | null } = {
            name: input.name
        };

        if (input.catalog_uuid !== undefined) {
            body.catalog_uuid = input.catalog_uuid;
        }

        // https://docs.dynamicmockups.com/
        const response = await nango.post({
            endpoint: '/v1/collections',
            data: body,
            retries: 3
        });

        const responseBody = z
            .object({
                data: ProviderCollectionSchema,
                success: z.boolean(),
                message: z.string()
            })
            .parse(response.data);

        return responseBody.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
