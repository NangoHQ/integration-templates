import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('The unique identifier for the product. Example: 13')
});

const ProductSchema = z.object({
    id: z.number(),
    name: z.string(),
    slug: z.string(),
    permalink: z.string(),
    date_created: z.string(),
    date_created_gmt: z.string(),
    date_modified: z.string(),
    date_modified_gmt: z.string(),
    type: z.string(),
    status: z.string(),
    featured: z.boolean(),
    catalog_visibility: z.string(),
    description: z.string(),
    short_description: z.string(),
    sku: z.string(),
    price: z.string(),
    regular_price: z.string(),
    sale_price: z.string().nullable().optional(),
    date_on_sale_from: z.string().nullable().optional(),
    date_on_sale_from_gmt: z.string().nullable().optional(),
    date_on_sale_to: z.string().nullable().optional(),
    date_on_sale_to_gmt: z.string().nullable().optional(),
    price_html: z.string(),
    on_sale: z.boolean(),
    purchasable: z.boolean(),
    total_sales: z.number(),
    virtual: z.boolean(),
    downloadable: z.boolean(),
    downloads: z.array(z.unknown()).optional(),
    download_limit: z.number(),
    download_expiry: z.number(),
    external_url: z.string(),
    button_text: z.string(),
    tax_status: z.string(),
    tax_class: z.string(),
    manage_stock: z.boolean(),
    stock_quantity: z.number().nullable().optional(),
    stock_status: z.string(),
    backorders: z.string(),
    backorders_allowed: z.boolean(),
    backordered: z.boolean(),
    sold_individually: z.boolean(),
    weight: z.string(),
    dimensions: z
        .object({
            length: z.string(),
            width: z.string(),
            height: z.string()
        })
        .optional(),
    shipping_required: z.boolean(),
    shipping_taxable: z.boolean(),
    shipping_class: z.string(),
    shipping_class_id: z.number(),
    reviews_allowed: z.boolean(),
    average_rating: z.string(),
    rating_count: z.number(),
    related_ids: z.array(z.number()).optional(),
    upsell_ids: z.array(z.number()).optional(),
    cross_sell_ids: z.array(z.number()).optional(),
    parent_id: z.number(),
    purchase_note: z.string(),
    categories: z
        .array(
            z.object({
                id: z.number(),
                name: z.string(),
                slug: z.string()
            })
        )
        .optional(),
    tags: z
        .array(
            z.object({
                id: z.number(),
                name: z.string(),
                slug: z.string()
            })
        )
        .optional(),
    images: z
        .array(
            z.object({
                id: z.number(),
                date_created: z.string(),
                date_created_gmt: z.string(),
                date_modified: z.string(),
                date_modified_gmt: z.string(),
                src: z.string(),
                name: z.string(),
                alt: z.string()
            })
        )
        .optional(),
    attributes: z
        .array(
            z.object({
                id: z.number(),
                name: z.string(),
                position: z.number(),
                visible: z.boolean(),
                variation: z.boolean(),
                options: z.array(z.string())
            })
        )
        .optional(),
    default_attributes: z.array(z.unknown()).optional(),
    variations: z.array(z.number()).optional(),
    grouped_products: z.array(z.number()).optional(),
    menu_order: z.number(),
    meta_data: z
        .array(
            z.object({
                id: z.number(),
                key: z.string(),
                value: z.unknown()
            })
        )
        .optional()
});

const OutputSchema = ProductSchema;

const action = createAction({
    description: 'Retrieve a single product from WooCommerce',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-product'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://woocommerce.github.io/woocommerce-rest-api-docs/#retrieve-a-product
        const response = await nango.get({
            endpoint: `/wp-json/wc/v3/products/${encodeURIComponent(String(input.id))}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Product not found',
                id: input.id
            });
        }

        const product = ProductSchema.parse(response.data);
        return product;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
