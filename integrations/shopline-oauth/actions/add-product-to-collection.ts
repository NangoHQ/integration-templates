import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        collection_id: z.string().describe('ID of the manual collection to add the product to.'),
        product_id: z.string().describe('ID of the product to link to the collection.')
    })
    .describe('Input to add a product to a collection.');

const CollectSchema = z.object({
    id: z.number().describe('Unique numeric ID of the newly created collect relationship.'),
    collection_id: z.string().describe('ID of the collection the product is linked to.'),
    product_id: z.string().describe('ID of the product linked to the collection.'),
    product_priority: z.number().describe('Display priority of the product within the collection.'),
    sort_value: z.string().describe('Sort value used for ordering products in the collection.'),
    created_at: z.string().describe('ISO 8601 timestamp when the collect was created.'),
    updated_at: z.string().describe('ISO 8601 timestamp when the collect was last updated.')
});

const OutputSchema = z
    .object({
        collect: CollectSchema.describe('The collect relationship created between the product and collection.')
    })
    .describe('Output of adding a product to a collection.');

/**
 * @tags: [write]
 * @tagReason: Creates a new collect row linking a product to a collection via the provider API.
 * @pitfalls: Calling this action twice with the same IDs creates two separate relationship rows instead of failing or deduplicating.
 */
const action = createAction({
    description: 'Link one product to one collection (creates a single "collect" relationship row).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['products', 'custom_collections'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.shopline.com/docs/admin-rest-api/v20260601/products/collects/create-collect
        const response = await nango.post({
            endpoint: '/admin/openapi/v20260601/products/collects.json',
            data: {
                collect: {
                    collection_id: input.collection_id,
                    product_id: input.product_id
                }
            },
            retries: 3
        });

        const providerCollect = CollectSchema.parse(response.data?.collect);

        return {
            collect: providerCollect
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
