import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Unique identifier for the product category. Example: 16'),
    name: z.string().optional().describe('Category name.'),
    slug: z.string().optional().describe('An alphanumeric identifier for the resource unique to its type.'),
    parent: z.number().optional().describe('The ID for the parent of the resource.'),
    description: z.string().optional().describe('HTML description of the resource.'),
    display: z.string().optional().describe('Category archive display type. Options: default, products, subcategories and both. Default is default.'),
    image: z
        .object({
            id: z.number().optional().describe('Image ID.')
        })
        .optional()
        .describe('Image data.'),
    menu_order: z.number().optional().describe('Menu order, used to custom sort the resource.')
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
    slug: z.string().optional(),
    parent: z.number().optional(),
    description: z.string().optional(),
    display: z.string().optional(),
    image: ProviderImageSchema.nullable().optional(),
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
    image: z
        .object({
            id: z.number().optional(),
            date_created: z.string().optional(),
            date_created_gmt: z.string().optional(),
            date_modified: z.string().optional(),
            date_modified_gmt: z.string().optional(),
            src: z.string().optional(),
            name: z.string().optional(),
            alt: z.string().optional()
        })
        .optional(),
    menu_order: z.number().optional(),
    count: z.number().optional()
});

const action = createAction({
    description: 'Update a product category in WooCommerce.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-product-category',
        group: 'Products'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_products', 'write_products'],

    exec: async (nango, input) => {
        const data: {
            name?: string;
            slug?: string;
            parent?: number;
            description?: string;
            display?: string;
            image?: { id?: number | undefined };
            menu_order?: number;
        } = {};

        if (input.name !== undefined) {
            data.name = input.name;
        }
        if (input.slug !== undefined) {
            data.slug = input.slug;
        }
        if (input.parent !== undefined) {
            data.parent = input.parent;
        }
        if (input.description !== undefined) {
            data.description = input.description;
        }
        if (input.display !== undefined) {
            data.display = input.display;
        }
        if (input.image !== undefined) {
            data.image = input.image;
        }
        if (input.menu_order !== undefined) {
            data.menu_order = input.menu_order;
        }

        const response = await nango.patch({
            // https://woocommerce.github.io/woocommerce-rest-api-docs/#update-a-product-category
            endpoint: `/wp-json/wc/v3/products/categories/${input.id}`,
            data,
            retries: 3
        });

        const providerCategory = ProviderCategorySchema.parse(response.data);

        return {
            id: providerCategory.id,
            name: providerCategory.name,
            ...(providerCategory.slug !== undefined && { slug: providerCategory.slug }),
            ...(providerCategory.parent !== undefined && { parent: providerCategory.parent }),
            ...(providerCategory.description !== undefined && { description: providerCategory.description }),
            ...(providerCategory.display !== undefined && { display: providerCategory.display }),
            ...(providerCategory.image !== undefined &&
                providerCategory.image !== null && {
                    image: {
                        ...(providerCategory.image.id !== undefined && { id: providerCategory.image.id }),
                        ...(providerCategory.image.date_created !== undefined && { date_created: providerCategory.image.date_created }),
                        ...(providerCategory.image.date_created_gmt !== undefined && { date_created_gmt: providerCategory.image.date_created_gmt }),
                        ...(providerCategory.image.date_modified !== undefined && { date_modified: providerCategory.image.date_modified }),
                        ...(providerCategory.image.date_modified_gmt !== undefined && { date_modified_gmt: providerCategory.image.date_modified_gmt }),
                        ...(providerCategory.image.src !== undefined && { src: providerCategory.image.src }),
                        ...(providerCategory.image.name !== undefined && { name: providerCategory.image.name }),
                        ...(providerCategory.image.alt !== undefined && { alt: providerCategory.image.alt })
                    }
                }),
            ...(providerCategory.menu_order !== undefined && { menu_order: providerCategory.menu_order }),
            ...(providerCategory.count !== undefined && { count: providerCategory.count })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
