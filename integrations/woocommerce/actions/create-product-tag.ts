import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Product tag name. Example: "New Arrival"'),
    slug: z.string().optional().describe('An alphanumeric identifier for the tag unique to its type. Example: "new-arrival"'),
    description: z.string().optional().describe('HTML description of the tag. Example: "Latest products in our store"')
});

const ProviderProductTagSchema = z.object({
    id: z.number(),
    name: z.string(),
    slug: z.string(),
    description: z.string().optional(),
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
    description: 'Create a product tag in WooCommerce.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read', 'write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, string | undefined> = {
            name: input.name,
            ...(input.slug !== undefined && { slug: input.slug }),
            ...(input.description !== undefined && { description: input.description })
        };

        // https://woocommerce.github.io/woocommerce-rest-api-docs/#create-a-product-tag
        const response = await nango.post({
            endpoint: '/wp-json/wc/v3/products/tags',
            data: requestBody,
            retries: 3
        });

        const providerTag = ProviderProductTagSchema.parse(response.data);

        return {
            id: providerTag.id,
            name: providerTag.name,
            ...(providerTag.slug !== undefined && { slug: providerTag.slug }),
            ...(providerTag.description !== undefined && { description: providerTag.description }),
            ...(providerTag.count !== undefined && { count: providerTag.count })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
