import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        product_id: z.string().describe('The unique identifier of the product to delete. Example: "16076831074833682966241755"')
    })
    .describe('Input for deleting a product.');

const OutputSchema = z
    .object({
        product_id: z.string().describe('The unique identifier of the deleted product.'),
        success: z.boolean().describe('Whether the product was successfully deleted.')
    })
    .describe('Output confirming a product deletion.');

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes a product from the SHOPLINE store permanently. This is a destructive write operation that cannot be undone.
 * @pitfalls: Deleting a product permanently removes its variants and images in the same operation with no separate confirmation.
 */
const action = createAction({
    description: 'Delete a product.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['products'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.shopline.com/docs/admin-rest-api/v20260601/products/product/delete-a-product
        await nango.delete({
            endpoint: `/admin/openapi/v20260601/products/${encodeURIComponent(input.product_id)}.json`,
            retries: 3
        });

        return {
            product_id: input.product_id,
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
