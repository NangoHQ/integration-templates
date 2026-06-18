import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Unique identifier for the product tag. Example: 19'),
    name: z.string().optional().describe('Tag name.'),
    slug: z.string().optional().describe('Tag slug.'),
    description: z.string().optional().describe('Tag description.')
});

const ProviderProductTagSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    slug: z.string().optional(),
    description: z.string().optional(),
    count: z.number().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    slug: z.string().optional(),
    description: z.string().optional(),
    count: z.number().optional()
});

const action = createAction({
    description: 'Update a product tag in WooCommerce.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.patch({
            // https://woocommerce.github.io/woocommerce-rest-api-docs/#update-a-product-tag
            endpoint: `/wp-json/wc/v3/products/tags/${encodeURIComponent(String(input.id))}`,
            data: {
                ...(input.name !== undefined && { name: input.name }),
                ...(input.slug !== undefined && { slug: input.slug }),
                ...(input.description !== undefined && { description: input.description })
            },
            retries: 3
        });

        const providerTag = ProviderProductTagSchema.parse(response.data);

        return {
            id: providerTag.id,
            ...(providerTag.name !== undefined && { name: providerTag.name }),
            ...(providerTag.slug !== undefined && { slug: providerTag.slug }),
            ...(providerTag.description !== undefined && { description: providerTag.description }),
            ...(providerTag.count !== undefined && { count: providerTag.count })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
