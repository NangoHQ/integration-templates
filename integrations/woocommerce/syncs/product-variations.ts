import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProductVariationSchema = z.object({
    id: z.string(),
    product_id: z.string(),
    date_created: z.string().optional(),
    date_modified: z.string(),
    description: z.string().optional(),
    permalink: z.string().optional(),
    sku: z.string().optional(),
    price: z.string().optional(),
    regular_price: z.string().optional(),
    sale_price: z.string().optional(),
    status: z.string().optional(),
    stock_status: z.string().optional(),
    stock_quantity: z.number().optional(),
    manage_stock: z.union([z.boolean(), z.string()]).optional(),
    weight: z.string().optional(),
    dimensions: z
        .object({
            length: z.string().optional(),
            width: z.string().optional(),
            height: z.string().optional()
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
    image: z
        .object({
            id: z.number().optional(),
            src: z.string().optional(),
            name: z.string().optional(),
            alt: z.string().optional()
        })
        .optional(),
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

type ProductVariation = z.infer<typeof ProductVariationSchema>;

const sync = createSync({
    description: 'Sync product variations from WooCommerce.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        ProductVariation: ProductVariationSchema
    },
    syncType: 'full',
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/product-variations'
        }
    ],

    exec: async (nango) => {
        // Blocker: the WooCommerce product variations endpoint does not expose
        // modified_after, since_id, cursor, or any change-tracking mechanism.
        // The `after` parameter only filters by published/created date, not
        // modification date. Full refresh is required to capture all changes.

        const productsConfig: ProxyConfiguration = {
            // https://woocommerce.github.io/woocommerce-rest-api-docs/#list-all-products
            endpoint: '/wp-json/wc/v3/products',
            params: {
                type: 'variable',
                per_page: '100'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100
            },
            retries: 3
        };

        await nango.trackDeletesStart('ProductVariation');

        for await (const productsPage of nango.paginate<unknown>(productsConfig)) {
            if (!Array.isArray(productsPage)) {
                throw new Error('Unexpected products response: expected array');
            }

            const variableProductIds: string[] = [];
            for (const rawProduct of productsPage) {
                const product = z
                    .object({
                        id: z.number(),
                        type: z.string().optional()
                    })
                    .safeParse(rawProduct);

                if (product.success && product.data.type === 'variable') {
                    variableProductIds.push(String(product.data.id));
                }
            }

            for (const productId of variableProductIds) {
                const variationsConfig: ProxyConfiguration = {
                    // https://woocommerce.github.io/woocommerce-rest-api-docs/#list-all-product-variations
                    endpoint: `/wp-json/wc/v3/products/${encodeURIComponent(productId)}/variations`,
                    params: {
                        per_page: '100'
                    },
                    paginate: {
                        type: 'offset',
                        offset_name_in_request: 'page',
                        offset_start_value: 1,
                        offset_calculation_method: 'per-page',
                        limit_name_in_request: 'per_page',
                        limit: 100
                    },
                    retries: 3
                };

                for await (const variationsPage of nango.paginate<unknown>(variationsConfig)) {
                    if (!Array.isArray(variationsPage)) {
                        throw new Error('Unexpected variations response: expected array');
                    }

                    const variations: ProductVariation[] = [];
                    for (const rawVariation of variationsPage) {
                        const parsed = z
                            .object({
                                id: z.number(),
                                date_modified_gmt: z.string(),
                                date_created: z.string().optional(),
                                date_created_gmt: z.string().optional(),
                                description: z.string().nullable().optional(),
                                permalink: z.string().optional(),
                                sku: z.string().nullable().optional(),
                                price: z.string().optional(),
                                regular_price: z.string().nullable().optional(),
                                sale_price: z.string().nullable().optional(),
                                status: z.string().optional(),
                                stock_status: z.string().optional(),
                                stock_quantity: z.number().nullable().optional(),
                                manage_stock: z.union([z.boolean(), z.string()]).optional(),
                                weight: z.string().nullable().optional(),
                                dimensions: z
                                    .object({
                                        length: z.string().optional(),
                                        width: z.string().optional(),
                                        height: z.string().optional()
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
                                image: z
                                    .object({
                                        id: z.number().optional(),
                                        src: z.string().optional(),
                                        name: z.string().optional(),
                                        alt: z.string().optional()
                                    })
                                    .nullable()
                                    .optional(),
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
                            .safeParse(rawVariation);

                        if (!parsed.success) {
                            throw new Error(`Failed to parse variation for product ${productId}: ${JSON.stringify(parsed.error.issues)}`);
                        }

                        const v = parsed.data;
                        variations.push({
                            id: String(v.id),
                            product_id: productId,
                            ...(v.date_created && { date_created: v.date_created }),
                            date_modified: v.date_modified_gmt,
                            ...(v.description != null && v.description !== '' && { description: v.description }),
                            ...(v.permalink && { permalink: v.permalink }),
                            ...(v.sku != null && v.sku !== '' && { sku: v.sku }),
                            ...(v.price && { price: v.price }),
                            ...(v.regular_price != null && v.regular_price !== '' && { regular_price: v.regular_price }),
                            ...(v.sale_price != null && v.sale_price !== '' && { sale_price: v.sale_price }),
                            ...(v.status && { status: v.status }),
                            ...(v.stock_status && { stock_status: v.stock_status }),
                            ...(v.stock_quantity != null && { stock_quantity: v.stock_quantity }),
                            ...(v.manage_stock !== undefined && { manage_stock: v.manage_stock }),
                            ...(v.weight != null && v.weight !== '' && { weight: v.weight }),
                            ...(v.dimensions && { dimensions: v.dimensions }),
                            ...(v.attributes && { attributes: v.attributes }),
                            ...(v.image != null && { image: v.image }),
                            ...(v.meta_data && { meta_data: v.meta_data })
                        });
                    }

                    if (variations.length > 0) {
                        await nango.batchSave(variations, 'ProductVariation');
                    }
                }
            }
        }

        await nango.trackDeletesEnd('ProductVariation');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
