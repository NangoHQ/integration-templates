import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    product_id: z.number().int().positive().describe('The ID of the parent variable product. Example: 13'),
    variation_id: z.number().int().positive().describe('The ID of the product variation to retrieve. Example: 16')
});

const ProviderProductVariationSchema = z
    .object({
        id: z.number().int(),
        date_created: z.string().optional(),
        date_created_gmt: z.string().optional(),
        date_modified: z.string().optional(),
        date_modified_gmt: z.string().optional(),
        description: z.string().optional(),
        permalink: z.string().optional(),
        sku: z.string().optional(),
        price: z.string().optional(),
        regular_price: z.string().optional(),
        sale_price: z.string().optional(),
        date_on_sale_from: z.string().nullable().optional(),
        date_on_sale_from_gmt: z.string().nullable().optional(),
        date_on_sale_to: z.string().nullable().optional(),
        date_on_sale_to_gmt: z.string().nullable().optional(),
        on_sale: z.boolean().optional(),
        status: z.enum(['draft', 'pending', 'private', 'publish']).optional(),
        purchasable: z.boolean().optional(),
        virtual: z.boolean().optional(),
        downloadable: z.boolean().optional(),
        downloads: z.array(z.unknown()).optional(),
        download_limit: z.number().nullable().optional(),
        download_expiry: z.number().nullable().optional(),
        tax_status: z.enum(['taxable', 'shipping', 'none']).optional(),
        tax_class: z.string().optional(),
        manage_stock: z.boolean().optional(),
        stock_quantity: z.number().nullable().optional(),
        stock_status: z.enum(['instock', 'outofstock', 'onbackorder']).optional(),
        backorders: z.enum(['no', 'notify', 'yes']).optional(),
        backorders_allowed: z.boolean().optional(),
        backordered: z.boolean().optional(),
        weight: z.string().optional(),
        dimensions: z
            .object({
                length: z.string().optional(),
                width: z.string().optional(),
                height: z.string().optional()
            })
            .optional(),
        shipping_class: z.string().optional(),
        shipping_class_id: z.number().optional(),
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
            .nullable()
            .optional(),
        attributes: z
            .array(
                z.object({
                    id: z.number().optional(),
                    name: z.string().optional(),
                    option: z.string().optional()
                })
            )
            .optional(),
        menu_order: z.number().optional(),
        meta_data: z
            .array(
                z.object({
                    id: z.number().optional(),
                    key: z.string().optional(),
                    value: z.unknown().optional()
                })
            )
            .optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.number().int(),
    date_created: z.string().optional(),
    date_created_gmt: z.string().optional(),
    date_modified: z.string().optional(),
    date_modified_gmt: z.string().optional(),
    description: z.string().optional(),
    permalink: z.string().optional(),
    sku: z.string().optional(),
    price: z.string().optional(),
    regular_price: z.string().optional(),
    sale_price: z.string().optional(),
    date_on_sale_from: z.string().optional(),
    date_on_sale_from_gmt: z.string().optional(),
    date_on_sale_to: z.string().optional(),
    date_on_sale_to_gmt: z.string().optional(),
    on_sale: z.boolean().optional(),
    status: z.enum(['draft', 'pending', 'private', 'publish']).optional(),
    purchasable: z.boolean().optional(),
    virtual: z.boolean().optional(),
    downloadable: z.boolean().optional(),
    downloads: z.array(z.unknown()).optional(),
    download_limit: z.number().optional(),
    download_expiry: z.number().optional(),
    tax_status: z.enum(['taxable', 'shipping', 'none']).optional(),
    tax_class: z.string().optional(),
    manage_stock: z.boolean().optional(),
    stock_quantity: z.number().optional(),
    stock_status: z.enum(['instock', 'outofstock', 'onbackorder']).optional(),
    backorders: z.enum(['no', 'notify', 'yes']).optional(),
    backorders_allowed: z.boolean().optional(),
    backordered: z.boolean().optional(),
    weight: z.string().optional(),
    dimensions: z
        .object({
            length: z.string().optional(),
            width: z.string().optional(),
            height: z.string().optional()
        })
        .optional(),
    shipping_class: z.string().optional(),
    shipping_class_id: z.number().optional(),
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
    attributes: z
        .array(
            z.object({
                id: z.number().optional(),
                name: z.string().optional(),
                option: z.string().optional()
            })
        )
        .optional(),
    menu_order: z.number().optional(),
    meta_data: z
        .array(
            z.object({
                id: z.number().optional(),
                key: z.string().optional(),
                value: z.unknown().optional()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Retrieve a single product variation from WooCommerce',
    version: '1.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://woocommerce.github.io/woocommerce-rest-api-docs/#retrieve-a-product-variation
        const response = await nango.get({
            endpoint: `/wp-json/wc/v3/products/${encodeURIComponent(String(input.product_id))}/variations/${encodeURIComponent(String(input.variation_id))}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Product variation ${input.variation_id} not found for product ${input.product_id}`,
                product_id: input.product_id,
                variation_id: input.variation_id
            });
        }

        const providerVariation = ProviderProductVariationSchema.parse(response.data);

        // Helper function to normalize null to undefined
        const normalize = <T>(value: T | null | undefined): T | undefined => {
            return value === null ? undefined : value;
        };

        return {
            id: providerVariation.id,
            ...(providerVariation.date_created && { date_created: providerVariation.date_created }),
            ...(providerVariation.date_created_gmt && { date_created_gmt: providerVariation.date_created_gmt }),
            ...(providerVariation.date_modified && { date_modified: providerVariation.date_modified }),
            ...(providerVariation.date_modified_gmt && { date_modified_gmt: providerVariation.date_modified_gmt }),
            ...(providerVariation.description && { description: providerVariation.description }),
            ...(providerVariation.permalink && { permalink: providerVariation.permalink }),
            ...(providerVariation.sku && { sku: providerVariation.sku }),
            ...(providerVariation.price && { price: providerVariation.price }),
            ...(providerVariation.regular_price && { regular_price: providerVariation.regular_price }),
            ...(providerVariation.sale_price && { sale_price: providerVariation.sale_price }),
            ...(normalize(providerVariation.date_on_sale_from) && { date_on_sale_from: normalize(providerVariation.date_on_sale_from) }),
            ...(normalize(providerVariation.date_on_sale_from_gmt) && { date_on_sale_from_gmt: normalize(providerVariation.date_on_sale_from_gmt) }),
            ...(normalize(providerVariation.date_on_sale_to) && { date_on_sale_to: normalize(providerVariation.date_on_sale_to) }),
            ...(normalize(providerVariation.date_on_sale_to_gmt) && { date_on_sale_to_gmt: normalize(providerVariation.date_on_sale_to_gmt) }),
            ...(providerVariation.on_sale !== undefined && { on_sale: providerVariation.on_sale }),
            ...(providerVariation.status && { status: providerVariation.status }),
            ...(providerVariation.purchasable !== undefined && { purchasable: providerVariation.purchasable }),
            ...(providerVariation.virtual !== undefined && { virtual: providerVariation.virtual }),
            ...(providerVariation.downloadable !== undefined && { downloadable: providerVariation.downloadable }),
            ...(providerVariation.downloads && { downloads: providerVariation.downloads }),
            ...(normalize(providerVariation.download_limit) !== undefined && { download_limit: normalize(providerVariation.download_limit) }),
            ...(normalize(providerVariation.download_expiry) !== undefined && { download_expiry: normalize(providerVariation.download_expiry) }),
            ...(providerVariation.tax_status && { tax_status: providerVariation.tax_status }),
            ...(providerVariation.tax_class && { tax_class: providerVariation.tax_class }),
            ...(providerVariation.manage_stock !== undefined && { manage_stock: providerVariation.manage_stock }),
            ...(normalize(providerVariation.stock_quantity) !== undefined && { stock_quantity: normalize(providerVariation.stock_quantity) }),
            ...(providerVariation.stock_status && { stock_status: providerVariation.stock_status }),
            ...(providerVariation.backorders && { backorders: providerVariation.backorders }),
            ...(providerVariation.backorders_allowed !== undefined && { backorders_allowed: providerVariation.backorders_allowed }),
            ...(providerVariation.backordered !== undefined && { backordered: providerVariation.backordered }),
            ...(providerVariation.weight && { weight: providerVariation.weight }),
            ...(providerVariation.dimensions && { dimensions: providerVariation.dimensions }),
            ...(providerVariation.shipping_class && { shipping_class: providerVariation.shipping_class }),
            ...(providerVariation.shipping_class_id !== undefined && { shipping_class_id: providerVariation.shipping_class_id }),
            ...(providerVariation.image && { image: providerVariation.image }),
            ...(providerVariation.attributes && { attributes: providerVariation.attributes }),
            ...(providerVariation.menu_order !== undefined && { menu_order: providerVariation.menu_order }),
            ...(providerVariation.meta_data && { meta_data: providerVariation.meta_data })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
