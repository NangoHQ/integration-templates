import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const ImageInputSchema = z
    .object({
        src: z.string().optional(),
        name: z.string().optional(),
        alt: z.string().optional()
    })
    .optional();

const InputSchema = z.object({
    name: z.string(),
    slug: z.string().optional(),
    parent: z.number().optional(),
    description: z.string().optional(),
    display: z.string().optional(),
    image: ImageInputSchema,
    menu_order: z.number().optional()
});

const ProviderImageSchema = z.object({
    id: z.number().optional(),
    date_created: z.string().optional(),
    date_created_gmt: z.string().optional(),
    date_modified: z.string().optional(),
    date_modified_gmt: z.string().optional(),
    src: z.string().optional(),
    name: z.string().optional(),
    alt: z.string().optional()
});

const ProviderCategorySchema = z.object({
    id: z.number(),
    name: z.string(),
    slug: z.string().nullish(),
    parent: z.number().nullish(),
    description: z.string().nullish(),
    display: z.string().nullish(),
    image: ProviderImageSchema.nullish(),
    menu_order: z.number().nullish(),
    count: z.number().nullish()
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string(),
    slug: z.string().optional(),
    parent: z.number().optional(),
    description: z.string().optional(),
    display: z.string().optional(),
    image: ProviderImageSchema.optional(),
    menu_order: z.number().optional(),
    count: z.number().optional()
});

const action = createAction({
    description: 'Create a product category in WooCommerce.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write'],
    exec: async (nango, input) => {
        const config: ProxyConfiguration = {
            // https://woocommerce.github.io/woocommerce-rest-api-docs/#create-a-product-category
            endpoint: '/wp-json/wc/v3/products/categories',
            data: {
                name: input.name,
                ...(input.slug !== undefined && { slug: input.slug }),
                ...(input.parent !== undefined && { parent: input.parent }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.display !== undefined && { display: input.display }),
                ...(input.image !== undefined && { image: input.image }),
                ...(input.menu_order !== undefined && { menu_order: input.menu_order })
            },
            retries: 3
        };

        const response = await nango.post(config);

        const providerCategory = ProviderCategorySchema.parse(response.data);

        return {
            id: providerCategory.id,
            name: providerCategory.name,
            ...(providerCategory.slug != null && { slug: providerCategory.slug }),
            ...(providerCategory.parent != null && { parent: providerCategory.parent }),
            ...(providerCategory.description != null && { description: providerCategory.description }),
            ...(providerCategory.display != null && { display: providerCategory.display }),
            ...(providerCategory.image != null && { image: providerCategory.image }),
            ...(providerCategory.menu_order != null && { menu_order: providerCategory.menu_order }),
            ...(providerCategory.count != null && { count: providerCategory.count })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
