import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        collection_id: z.string().describe('ID of the manual collection to add products to. Example: "12276844465855355996481755"'),
        product_ids: z
            .array(z.string().describe('Product ID to add to the collection. Example: "16076844436209679787371755"'))
            .max(50)
            .describe('Array of product IDs to add to the collection. Maximum 50 items per call.')
    })
    .describe('Input for adding multiple products to a manual collection in a single request.');

/**
 * @tags: [write]
 * @tagReason: Adds products to a manual collection via a provider mutation.
 * @pitfalls: Only works for manual collections; smart collection membership is rule-computed and cannot be mutated. Maximum 50 product IDs per call.
 */
const action = createAction({
    description: 'Add multiple products to a manual collection in one call.',
    version: '1.0.0',
    input: InputSchema,
    output: z.null(),
    scopes: ['read_products', 'write_products'],

    exec: async (nango, input): Promise<null> => {
        // https://developer.shopline.com/docs/admin-rest-api/v20260601/products/custom-collection/bulk-add-products-to-collection
        await nango.post({
            endpoint: `/admin/openapi/v20260601/products/custom_collections/${encodeURIComponent(input.collection_id)}/products.json`,
            data: {
                product_ids: input.product_ids
            },
            retries: 3
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
