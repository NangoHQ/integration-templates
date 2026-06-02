import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Product ID. Example: "prod_xxx"')
});

const ProviderProductSchema = z.object({
    id: z.string(),
    deleted: z.boolean(),
    object: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    deleted: z.boolean()
});

const action = createAction({
    description: 'Delete or archive a product in Stripe.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-product',
        group: 'Products'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://docs.stripe.com/api/products/delete
            endpoint: `/v1/products/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        const providerProduct = ProviderProductSchema.parse(response.data);

        return {
            id: providerProduct.id,
            deleted: providerProduct.deleted
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
