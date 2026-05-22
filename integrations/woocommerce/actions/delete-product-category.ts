import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Unique identifier for the product category to delete. Example: 17'),
    force: z.boolean().optional().describe('Required to be true, as the resource does not support trashing.')
});

const ImageSchema = z.object({
    id: z.number().optional(),
    date_created: z.string().optional(),
    date_created_gmt: z.string().optional(),
    date_modified: z.string().optional(),
    date_modified_gmt: z.string().optional(),
    src: z.string().optional(),
    name: z.string().optional(),
    alt: z.string().optional()
});

const LinkSchema = z.object({
    href: z.string()
});

const LinksSchema = z.object({
    self: z.array(LinkSchema).optional(),
    collection: z.array(LinkSchema).optional()
});

const ProviderCategorySchema = z.object({
    id: z.number(),
    name: z.string().nullable().optional(),
    slug: z.string().nullable().optional(),
    parent: z.number().nullable().optional(),
    description: z.string().nullable().optional(),
    display: z.string().nullable().optional(),
    image: ImageSchema.nullable().optional(),
    menu_order: z.number().nullable().optional(),
    count: z.number().nullable().optional(),
    _links: LinksSchema.nullable().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    slug: z.string().optional(),
    parent: z.number().optional(),
    description: z.string().optional(),
    display: z.string().optional(),
    image: ImageSchema.optional(),
    menu_order: z.number().optional(),
    count: z.number().optional(),
    _links: LinksSchema.optional()
});

const action = createAction({
    description: 'Delete or archive a product category in WooCommerce.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-product-category',
        group: 'Product Categories'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://woocommerce.github.io/woocommerce-rest-api-docs/#delete-a-product-category
            endpoint: `/wp-json/wc/v3/products/categories/${encodeURIComponent(String(input.id))}`,
            params: {
                force: String(input.force ?? true)
            },
            retries: 10
        });

        const providerCategory = ProviderCategorySchema.parse(response.data);

        return {
            id: providerCategory.id,
            ...(providerCategory.name != null && { name: providerCategory.name }),
            ...(providerCategory.slug != null && { slug: providerCategory.slug }),
            ...(providerCategory.parent != null && { parent: providerCategory.parent }),
            ...(providerCategory.description != null && { description: providerCategory.description }),
            ...(providerCategory.display != null && { display: providerCategory.display }),
            ...(providerCategory.image != null && { image: providerCategory.image }),
            ...(providerCategory.menu_order != null && { menu_order: providerCategory.menu_order }),
            ...(providerCategory.count != null && { count: providerCategory.count }),
            ...(providerCategory._links != null && { _links: providerCategory._links })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
