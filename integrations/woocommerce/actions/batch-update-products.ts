import { z } from 'zod';
import { createAction } from 'nango';

const ProductCreateSchema = z.object({}).passthrough();

const ProductUpdateSchema = z
    .object({
        id: z.number()
    })
    .passthrough();

const InputSchema = z.object({
    create: z.array(ProductCreateSchema).optional(),
    update: z.array(ProductUpdateSchema).optional(),
    delete: z.array(z.number()).optional()
});

const CategorySchema = z.object({
    id: z.number().optional(),
    name: z.string().optional(),
    slug: z.string().optional()
});

const ImageSchema = z.object({
    id: z.number().optional(),
    date_created: z.string().optional(),
    date_modified: z.string().optional(),
    src: z.string().optional(),
    name: z.string().optional(),
    alt: z.string().optional()
});

const DimensionSchema = z.object({
    length: z.string().optional(),
    width: z.string().optional(),
    height: z.string().optional()
});

const ProductSchema = z
    .object({
        id: z.number(),
        name: z.string().optional(),
        slug: z.string().optional(),
        permalink: z.string().optional(),
        date_created: z.string().optional(),
        date_created_gmt: z.string().optional(),
        date_modified: z.string().optional(),
        date_modified_gmt: z.string().optional(),
        type: z.string().optional(),
        status: z.string().optional(),
        featured: z.boolean().optional(),
        catalog_visibility: z.string().optional(),
        description: z.string().optional(),
        short_description: z.string().optional(),
        sku: z.string().optional(),
        price: z.string().optional(),
        regular_price: z.string().optional(),
        sale_price: z.string().nullable().optional(),
        date_on_sale_from: z.string().nullable().optional(),
        date_on_sale_from_gmt: z.string().nullable().optional(),
        date_on_sale_to: z.string().nullable().optional(),
        date_on_sale_to_gmt: z.string().nullable().optional(),
        price_html: z.string().optional(),
        on_sale: z.boolean().optional(),
        purchasable: z.boolean().optional(),
        total_sales: z.number().optional(),
        virtual: z.boolean().optional(),
        downloadable: z.boolean().optional(),
        downloads: z.array(z.record(z.string(), z.unknown())).optional(),
        download_limit: z.number().optional(),
        download_expiry: z.number().optional(),
        external_url: z.string().optional(),
        button_text: z.string().optional(),
        tax_status: z.string().optional(),
        tax_class: z.string().optional(),
        manage_stock: z.boolean().optional(),
        stock_quantity: z.number().nullable().optional(),
        stock_status: z.string().optional(),
        backorders: z.string().optional(),
        backorders_allowed: z.boolean().optional(),
        backordered: z.boolean().optional(),
        sold_individually: z.boolean().optional(),
        weight: z.string().optional(),
        dimensions: DimensionSchema.optional(),
        shipping_required: z.boolean().optional(),
        shipping_taxable: z.boolean().optional(),
        shipping_class: z.string().optional(),
        shipping_class_id: z.number().optional(),
        reviews_allowed: z.boolean().optional(),
        average_rating: z.string().optional(),
        rating_count: z.number().optional(),
        related_ids: z.array(z.number()).optional(),
        upsell_ids: z.array(z.number()).optional(),
        cross_sell_ids: z.array(z.number()).optional(),
        parent_id: z.number().optional(),
        purchase_note: z.string().optional(),
        categories: z.array(CategorySchema).optional(),
        tags: z.array(CategorySchema).optional(),
        images: z.array(ImageSchema).optional(),
        attributes: z.array(z.record(z.string(), z.unknown())).optional(),
        default_attributes: z.array(z.record(z.string(), z.unknown())).optional(),
        variations: z.array(z.number()).optional(),
        grouped_products: z.array(z.number()).optional(),
        menu_order: z.number().optional(),
        meta_data: z.array(z.record(z.string(), z.unknown())).optional()
    })
    .passthrough();

const OutputSchema = z.object({
    create: z.array(ProductSchema).optional(),
    update: z.array(ProductSchema).optional(),
    delete: z.array(ProductSchema).optional()
});

const action = createAction({
    description: 'Create, update, and delete WooCommerce products in a batch.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        // https://woocommerce.github.io/woocommerce-rest-api-docs/#batch-update-products
        const response = await nango.post({
            endpoint: '/wp-json/wc/v3/products/batch',
            data: {
                ...(input.create !== undefined && { create: input.create }),
                ...(input.update !== undefined && { update: input.update }),
                ...(input.delete !== undefined && { delete: input.delete })
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                create: z.array(z.record(z.string(), z.unknown())).optional(),
                update: z.array(z.record(z.string(), z.unknown())).optional(),
                delete: z.array(z.record(z.string(), z.unknown())).optional()
            })
            .parse(response.data);

        return {
            ...(providerResponse.create !== undefined && {
                create: providerResponse.create.map((item) => ProductSchema.parse(item))
            }),
            ...(providerResponse.update !== undefined && {
                update: providerResponse.update.map((item) => ProductSchema.parse(item))
            }),
            ...(providerResponse.delete !== undefined && {
                delete: providerResponse.delete.map((item) => ProductSchema.parse(item))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
