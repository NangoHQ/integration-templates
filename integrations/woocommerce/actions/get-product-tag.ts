import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Product tag ID. Example: 19')
});

const ProviderProductTagSchema = z.object({
    id: z.number(),
    name: z.string(),
    slug: z.string().optional(),
    description: z.string().optional().nullable(),
    count: z.number().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string(),
    slug: z.string().optional(),
    description: z.string().optional(),
    count: z.number().optional()
});

const action = createAction({
    description: 'Retrieve a single product tag from WooCommerce.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-product-tag',
        group: 'Product Tags'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://woocommerce.github.io/woocommerce-rest-api-docs/#product-tag-properties
            endpoint: `wp-json/wc/v3/products/tags/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Product tag not found',
                id: input.id
            });
        }

        const providerTag = ProviderProductTagSchema.parse(response.data);

        return {
            id: providerTag.id,
            name: providerTag.name,
            ...(providerTag.slug !== undefined && { slug: providerTag.slug }),
            ...(providerTag.description != null && { description: providerTag.description }),
            ...(providerTag.count !== undefined && { count: providerTag.count })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
