import { z } from 'zod';
import { createAction } from 'nango';

const WishlistItemInputSchema = z.object({
    product_id: z.number().describe('Product ID. Example: 77'),
    variant_id: z.number().describe('Variant ID. Example: 1')
});

const InputSchema = z.object({
    name: z.string().describe('The title of the wishlist. Example: "School Shopping"'),
    customer_id: z.number().describe('The customer ID. Example: 1'),
    is_public: z.boolean().optional().describe('Whether the wishlist is available to the public. Example: false'),
    items: z.array(WishlistItemInputSchema).optional().describe('Array of wishlist items to add during creation.')
});

const WishlistItemOutputSchema = z.object({
    id: z.number(),
    product_id: z.number(),
    variant_id: z.number()
});

const WishlistSchema = z.object({
    id: z.number(),
    customer_id: z.number(),
    name: z.string(),
    is_public: z.boolean(),
    token: z.string(),
    items: z.array(WishlistItemOutputSchema)
});

const ProviderResponseSchema = z.object({
    data: WishlistSchema,
    meta: z.object({}).passthrough().optional()
});

const action = createAction({
    description: 'Create a wishlist',
    version: '1.0.0',
    input: InputSchema,
    output: WishlistSchema,
    scopes: ['store_v2_customers'],

    exec: async (nango, input): Promise<z.infer<typeof WishlistSchema>> => {
        const response = await nango.post({
            // https://developer.bigcommerce.com/docs/rest-management/wishlists
            endpoint: '/v3/wishlists',
            data: {
                name: input.name,
                customer_id: input.customer_id,
                ...(input.is_public !== undefined && { is_public: input.is_public }),
                ...(input.items !== undefined && { items: input.items })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return providerResponse.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
