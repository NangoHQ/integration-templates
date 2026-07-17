import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    product_id: z.string().describe('The ID of the product to retrieve. Example: "PROD-42B01413RE336243T"')
});

const OutputSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        description: z.string().optional(),
        type: z.string().optional(),
        category: z.string().optional(),
        image_url: z.string().optional(),
        home_url: z.string().optional(),
        create_time: z.string().optional(),
        update_time: z.string().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a catalog product',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.paypal.com/api/catalog/v1/#products_get
            endpoint: `/v1/catalogs/products/${encodeURIComponent(input.product_id)}`,
            retries: 3
        });

        const product = OutputSchema.parse(response.data);

        return product;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
