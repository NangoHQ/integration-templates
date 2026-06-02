import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the product to retrieve. Example: "prod_xxx"')
});

const OutputSchema = z.object({
    id: z.string(),
    object: z.literal('product'),
    active: z.boolean(),
    created: z.number(),
    default_price: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    images: z.array(z.string()).optional(),
    livemode: z.boolean(),
    marketing_features: z.array(z.object({ name: z.string() })).optional(),
    metadata: z.record(z.string(), z.string()).optional(),
    name: z.string(),
    package_dimensions: z
        .object({
            height: z.number(),
            length: z.number(),
            weight: z.number(),
            width: z.number()
        })
        .nullable()
        .optional(),
    shippable: z.boolean().nullable().optional(),
    statement_descriptor: z.string().nullable().optional(),
    tax_code: z.string().nullable().optional(),
    unit_label: z.string().nullable().optional(),
    updated: z.number(),
    url: z.string().nullable().optional()
});

const action = createAction({
    description: 'Retrieve a single product from Stripe.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-product',
        group: 'Products'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.stripe.com/api/products/retrieve
            endpoint: `/v1/products/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Product not found',
                id: input.id
            });
        }

        const product = OutputSchema.parse(response.data);

        return product;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
