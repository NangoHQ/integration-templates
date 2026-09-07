import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        product_id: z.string().describe('The ID of the product that owns the variant to delete.'),
        variant_id: z.string().describe('The ID of the product variant to delete.')
    })
    .describe('Input for deleting a product variant.');

const OutputSchema = z
    .object({
        success: z.boolean().describe('Whether the variant was successfully deleted.')
    })
    .describe('Output confirming a product variant deletion.');

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes a product variant permanently from the provider.
 */
const action = createAction({
    description: 'Delete a product variant.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.shopline.com/docs/admin-rest-api/v20260601/product/product-variant/delete-a-product-variant
        await nango.delete({
            endpoint: `/admin/openapi/v20260601/products/${encodeURIComponent(input.product_id)}/variants/${encodeURIComponent(input.variant_id)}.json`,
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
