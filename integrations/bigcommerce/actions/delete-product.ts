import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    product_id: z.number().describe('Product ID to delete. Example: 123')
});

const OutputSchema = z.object({
    id: z.number().describe('Deleted product ID'),
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a product',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['store_v2_products'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.bigcommerce.com/docs/rest-management/catalog/products#delete-a-product
        await nango.delete({
            endpoint: `/v3/catalog/products/${encodeURIComponent(input.product_id)}`,
            retries: 3
        });

        return {
            id: input.product_id,
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
