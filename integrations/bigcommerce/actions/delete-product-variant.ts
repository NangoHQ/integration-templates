import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    product_id: z.number().describe('The ID of the product to which the variant belongs. Example: 123'),
    variant_id: z.number().describe('The ID of the variant to delete. Example: 456')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a product variant.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['store_v2_products'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://developer.bigcommerce.com/docs/rest-management/catalog/product-variants#delete-a-product-variant
            endpoint: `/v3/catalog/products/${encodeURIComponent(input.product_id)}/variants/${encodeURIComponent(input.variant_id)}`,
            retries: 1
        });

        if (response.status === 204 || response.status === 200) {
            return { success: true };
        }

        throw new nango.ActionError({
            type: 'delete_failed',
            message: `Failed to delete variant. Received status ${response.status}.`,
            product_id: input.product_id,
            variant_id: input.variant_id
        });
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
