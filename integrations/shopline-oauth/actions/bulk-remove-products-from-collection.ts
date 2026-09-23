import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        collection_id: z.string().describe('The ID of the manual collection to remove products from. Example: "12276844464740342190251755"'),
        product_ids: z
            .array(z.string().describe('A product ID to remove from the collection.'))
            .describe('The product IDs to remove from the collection. Maximum 50 per call. Example: ["16076831074833682966241755"]')
    })
    .describe('Input for removing multiple products from a manual collection in one call.');

const OutputSchema = z.object({}).describe('Empty success response returned by the provider when the removal completes.');

const ProviderResponseSchema = z.object({});

/**
 * @tags: [write, destructive]
 * @tagReason: Removes product-to-collection associations in bulk on the provider.
 * @pitfalls: Only manual collections support this operation; smart collections are rule-based and cannot have products removed in bulk.
 */
const action = createAction({
    description: 'Remove multiple products from a manual collection in one call.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_products'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.product_ids.length > 50) {
            throw new nango.ActionError({
                type: 'input_too_large',
                message: 'Cannot remove more than 50 products at once.'
            });
        }

        const response = await nango.delete({
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/product/collection-relationship/remove-products-from-a-manual-collection
            endpoint: `/admin/openapi/v20260601/products/custom_collections/${encodeURIComponent(input.collection_id)}/products.json`,
            data: {
                product_ids: input.product_ids
            },
            retries: 3
        });

        const output = ProviderResponseSchema.parse(response.data);
        return output;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
