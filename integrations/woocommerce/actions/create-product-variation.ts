import { z } from 'zod';
import { createAction } from 'nango';

const AttributeSchema = z.object({
    id: z.number().optional(),
    name: z.string().optional(),
    option: z.string().optional()
});

const DimensionsSchema = z.object({
    length: z.string().optional(),
    width: z.string().optional(),
    height: z.string().optional()
});

const ImageSchema = z.object({
    id: z.number().optional(),
    src: z.string().optional(),
    name: z.string().optional(),
    alt: z.string().optional()
});

const MetaDataSchema = z.object({
    id: z.number().optional(),
    key: z.string().optional(),
    value: z.unknown().optional()
});

const InputSchema = z.object({
    product_id: z.number().describe('Product ID of the parent variable product. Example: 13'),
    description: z.string().optional(),
    sku: z.string().optional(),
    regular_price: z.string().optional(),
    sale_price: z.string().optional(),
    date_on_sale_from: z.string().optional(),
    date_on_sale_to: z.string().optional(),
    status: z.enum(['draft', 'pending', 'private', 'publish']).optional(),
    virtual: z.boolean().optional(),
    downloadable: z.boolean().optional(),
    download_limit: z.number().optional(),
    download_expiry: z.number().optional(),
    tax_status: z.enum(['taxable', 'shipping', 'none']).optional(),
    tax_class: z.string().optional(),
    manage_stock: z.union([z.boolean(), z.literal('parent')]).optional(),
    stock_quantity: z.number().optional(),
    stock_status: z.enum(['instock', 'outofstock', 'onbackorder']).optional(),
    backorders: z.enum(['no', 'notify', 'yes']).optional(),
    weight: z.string().optional(),
    dimensions: DimensionsSchema.optional(),
    shipping_class: z.string().optional(),
    image: ImageSchema.optional(),
    attributes: z.array(AttributeSchema).optional(),
    menu_order: z.number().optional(),
    meta_data: z.array(MetaDataSchema).optional()
});

const ProviderAttributeSchema = z.object({
    id: z.number().optional(),
    name: z.string().optional(),
    option: z.string().optional()
});

const ProviderDimensionsSchema = z.object({
    length: z.string().optional(),
    width: z.string().optional(),
    height: z.string().optional()
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

const ProviderMetaDataSchema = z.object({
    id: z.number().optional(),
    key: z.string().optional(),
    value: z.unknown().optional()
});

const ProviderVariationSchema = z.object({
    id: z.number(),
    date_created: z.string().optional(),
    date_created_gmt: z.string().optional(),
    date_modified: z.string().optional(),
    date_modified_gmt: z.string().optional(),
    description: z.string().optional(),
    permalink: z.string().optional(),
    sku: z.string().optional(),
    global_unique_id: z.string().optional(),
    price: z.string().optional(),
    regular_price: z.string().optional(),
    sale_price: z.string().optional(),
    date_on_sale_from: z.string().nullable().optional(),
    date_on_sale_from_gmt: z.string().nullable().optional(),
    date_on_sale_to: z.string().nullable().optional(),
    date_on_sale_to_gmt: z.string().nullable().optional(),
    on_sale: z.boolean().optional(),
    status: z.string().optional(),
    purchasable: z.boolean().optional(),
    virtual: z.boolean().optional(),
    downloadable: z.boolean().optional(),
    downloads: z.array(z.unknown()).optional(),
    download_limit: z.number().optional(),
    download_expiry: z.number().optional(),
    tax_status: z.string().optional(),
    tax_class: z.string().optional(),
    manage_stock: z.union([z.boolean(), z.literal('parent')]).optional(),
    stock_quantity: z.number().nullable().optional(),
    stock_status: z.string().optional(),
    backorders: z.string().optional(),
    backorders_allowed: z.boolean().optional(),
    backordered: z.boolean().optional(),
    weight: z.string().optional(),
    dimensions: ProviderDimensionsSchema.optional(),
    shipping_class: z.string().optional(),
    shipping_class_id: z.number().optional(),
    image: ProviderImageSchema.nullable().optional(),
    attributes: z.array(ProviderAttributeSchema).optional(),
    menu_order: z.number().optional(),
    meta_data: z.array(ProviderMetaDataSchema).optional()
});

const OutputSchema = z.object({
    id: z.number(),
    date_created: z.string().optional(),
    date_created_gmt: z.string().optional(),
    date_modified: z.string().optional(),
    date_modified_gmt: z.string().optional(),
    description: z.string().optional(),
    permalink: z.string().optional(),
    sku: z.string().optional(),
    global_unique_id: z.string().optional(),
    price: z.string().optional(),
    regular_price: z.string().optional(),
    sale_price: z.string().optional(),
    date_on_sale_from: z.string().optional(),
    date_on_sale_from_gmt: z.string().optional(),
    date_on_sale_to: z.string().optional(),
    date_on_sale_to_gmt: z.string().optional(),
    on_sale: z.boolean().optional(),
    status: z.string().optional(),
    purchasable: z.boolean().optional(),
    virtual: z.boolean().optional(),
    downloadable: z.boolean().optional(),
    downloads: z.array(z.unknown()).optional(),
    download_limit: z.number().optional(),
    download_expiry: z.number().optional(),
    tax_status: z.string().optional(),
    tax_class: z.string().optional(),
    manage_stock: z.union([z.boolean(), z.literal('parent')]).optional(),
    stock_quantity: z.number().optional(),
    stock_status: z.string().optional(),
    backorders: z.string().optional(),
    backorders_allowed: z.boolean().optional(),
    backordered: z.boolean().optional(),
    weight: z.string().optional(),
    dimensions: ProviderDimensionsSchema.optional(),
    shipping_class: z.string().optional(),
    shipping_class_id: z.number().optional(),
    image: ProviderImageSchema.optional(),
    attributes: z.array(ProviderAttributeSchema).optional(),
    menu_order: z.number().optional(),
    meta_data: z.array(ProviderMetaDataSchema).optional()
});

const action = createAction({
    description: 'Create a product variation in WooCommerce.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_products'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const payload: Record<string, unknown> = {};

        if (input.description !== undefined) {
            payload['description'] = input.description;
        }
        if (input.sku !== undefined) {
            payload['sku'] = input.sku;
        }
        if (input.regular_price !== undefined) {
            payload['regular_price'] = input.regular_price;
        }
        if (input.sale_price !== undefined) {
            payload['sale_price'] = input.sale_price;
        }
        if (input.date_on_sale_from !== undefined) {
            payload['date_on_sale_from'] = input.date_on_sale_from;
        }
        if (input.date_on_sale_to !== undefined) {
            payload['date_on_sale_to'] = input.date_on_sale_to;
        }
        if (input.status !== undefined) {
            payload['status'] = input.status;
        }
        if (input.virtual !== undefined) {
            payload['virtual'] = input.virtual;
        }
        if (input.downloadable !== undefined) {
            payload['downloadable'] = input.downloadable;
        }
        if (input.download_limit !== undefined) {
            payload['download_limit'] = input.download_limit;
        }
        if (input.download_expiry !== undefined) {
            payload['download_expiry'] = input.download_expiry;
        }
        if (input.tax_status !== undefined) {
            payload['tax_status'] = input.tax_status;
        }
        if (input.tax_class !== undefined) {
            payload['tax_class'] = input.tax_class;
        }
        if (input.manage_stock !== undefined) {
            payload['manage_stock'] = input.manage_stock;
        }
        if (input.stock_quantity !== undefined) {
            payload['stock_quantity'] = input.stock_quantity;
        }
        if (input.stock_status !== undefined) {
            payload['stock_status'] = input.stock_status;
        }
        if (input.backorders !== undefined) {
            payload['backorders'] = input.backorders;
        }
        if (input.weight !== undefined) {
            payload['weight'] = input.weight;
        }
        if (input.dimensions !== undefined) {
            payload['dimensions'] = input.dimensions;
        }
        if (input.shipping_class !== undefined) {
            payload['shipping_class'] = input.shipping_class;
        }
        if (input.image !== undefined) {
            payload['image'] = input.image;
        }
        if (input.attributes !== undefined) {
            payload['attributes'] = input.attributes;
        }
        if (input.menu_order !== undefined) {
            payload['menu_order'] = input.menu_order;
        }
        if (input.meta_data !== undefined) {
            payload['meta_data'] = input.meta_data;
        }

        // https://woocommerce.github.io/woocommerce-rest-api-docs/?javascript#create-a-product-variation
        const response = await nango.post({
            endpoint: `/wp-json/wc/v3/products/${encodeURIComponent(String(input.product_id))}/variations`,
            data: payload,
            retries: 1
        });

        const variation = ProviderVariationSchema.parse(response.data);

        return {
            id: variation.id,
            ...(variation.date_created !== undefined && { date_created: variation.date_created }),
            ...(variation.date_created_gmt !== undefined && { date_created_gmt: variation.date_created_gmt }),
            ...(variation.date_modified !== undefined && { date_modified: variation.date_modified }),
            ...(variation.date_modified_gmt !== undefined && { date_modified_gmt: variation.date_modified_gmt }),
            ...(variation.description !== undefined && { description: variation.description }),
            ...(variation.permalink !== undefined && { permalink: variation.permalink }),
            ...(variation.sku !== undefined && { sku: variation.sku }),
            ...(variation.global_unique_id !== undefined && { global_unique_id: variation.global_unique_id }),
            ...(variation.price !== undefined && { price: variation.price }),
            ...(variation.regular_price !== undefined && { regular_price: variation.regular_price }),
            ...(variation.sale_price !== undefined && { sale_price: variation.sale_price }),
            ...(variation.date_on_sale_from != null && { date_on_sale_from: variation.date_on_sale_from }),
            ...(variation.date_on_sale_from_gmt != null && { date_on_sale_from_gmt: variation.date_on_sale_from_gmt }),
            ...(variation.date_on_sale_to != null && { date_on_sale_to: variation.date_on_sale_to }),
            ...(variation.date_on_sale_to_gmt != null && { date_on_sale_to_gmt: variation.date_on_sale_to_gmt }),
            ...(variation.on_sale !== undefined && { on_sale: variation.on_sale }),
            ...(variation.status !== undefined && { status: variation.status }),
            ...(variation.purchasable !== undefined && { purchasable: variation.purchasable }),
            ...(variation.virtual !== undefined && { virtual: variation.virtual }),
            ...(variation.downloadable !== undefined && { downloadable: variation.downloadable }),
            ...(variation.downloads !== undefined && { downloads: variation.downloads }),
            ...(variation.download_limit !== undefined && { download_limit: variation.download_limit }),
            ...(variation.download_expiry !== undefined && { download_expiry: variation.download_expiry }),
            ...(variation.tax_status !== undefined && { tax_status: variation.tax_status }),
            ...(variation.tax_class !== undefined && { tax_class: variation.tax_class }),
            ...(variation.manage_stock !== undefined && { manage_stock: variation.manage_stock }),
            ...(variation.stock_quantity != null && { stock_quantity: variation.stock_quantity }),
            ...(variation.stock_status !== undefined && { stock_status: variation.stock_status }),
            ...(variation.backorders !== undefined && { backorders: variation.backorders }),
            ...(variation.backorders_allowed !== undefined && { backorders_allowed: variation.backorders_allowed }),
            ...(variation.backordered !== undefined && { backordered: variation.backordered }),
            ...(variation.weight !== undefined && { weight: variation.weight }),
            ...(variation.dimensions !== undefined && { dimensions: variation.dimensions }),
            ...(variation.shipping_class !== undefined && { shipping_class: variation.shipping_class }),
            ...(variation.shipping_class_id !== undefined && { shipping_class_id: variation.shipping_class_id }),
            ...(variation.image != null && { image: variation.image }),
            ...(variation.attributes !== undefined && { attributes: variation.attributes }),
            ...(variation.menu_order !== undefined && { menu_order: variation.menu_order }),
            ...(variation.meta_data !== undefined && { meta_data: variation.meta_data })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
