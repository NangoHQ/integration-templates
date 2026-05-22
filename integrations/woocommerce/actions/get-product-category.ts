import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Product category ID. Example: 15')
});

const CategoryImageSchema = z.object({
    id: z.number(),
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
    slug: z.string().optional(),
    parent: z.number().optional(),
    description: z.string().optional(),
    display: z.string().optional(),
    image: CategoryImageSchema.nullable().optional(),
    menu_order: z.number().optional(),
    count: z.number().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string(),
    slug: z.string().optional(),
    parent: z.number().optional(),
    description: z.string().optional(),
    display: z.string().optional(),
    image: CategoryImageSchema.optional(),
    menu_order: z.number().optional(),
    count: z.number().optional()
});

const action = createAction({
    description: 'Retrieve a single product category from WooCommerce.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-product-category',
        group: 'Products'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://woocommerce.github.io/woocommerce-rest-api-docs/#retrieve-a-product-category
            endpoint: `/wp-json/wc/v3/products/categories/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Product category not found',
                id: input.id
            });
        }

        const category = ProviderCategorySchema.parse(response.data);

        return {
            id: category.id,
            name: category.name,
            ...(category.slug !== undefined && { slug: category.slug }),
            ...(category.parent !== undefined && { parent: category.parent }),
            ...(category.description !== undefined && { description: category.description }),
            ...(category.display !== undefined && { display: category.display }),
            ...(category.image != null && { image: category.image }),
            ...(category.menu_order !== undefined && { menu_order: category.menu_order }),
            ...(category.count !== undefined && { count: category.count })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
