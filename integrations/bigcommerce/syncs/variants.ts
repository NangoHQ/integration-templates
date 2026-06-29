import { createSync } from 'nango';
import { z } from 'zod';

const ProductSchema = z.object({
    id: z.number()
});

const PaginationLinksSchema = z.object({
    next: z.string().optional(),
    previous: z.string().optional(),
    current: z.string().optional()
});

const PaginationSchema = z.object({
    total: z.number().optional(),
    count: z.number().optional(),
    per_page: z.number().optional(),
    current_page: z.number().optional(),
    total_pages: z.number().optional(),
    links: PaginationLinksSchema.optional()
});

const ProductResponseSchema = z.object({
    data: z.array(ProductSchema),
    meta: z
        .object({
            pagination: PaginationSchema.optional()
        })
        .optional()
});

const VariantSchema = z.object({
    id: z.number(),
    product_id: z.number(),
    sku: z.string().optional(),
    price: z.number().nullable().optional(),
    calculated_price: z.number().nullable().optional(),
    sale_price: z.number().nullable().optional(),
    retail_price: z.number().nullable().optional(),
    map_price: z.number().nullable().optional(),
    weight: z.number().nullable().optional(),
    calculated_weight: z.number().nullable().optional(),
    width: z.number().nullable().optional(),
    height: z.number().nullable().optional(),
    depth: z.number().nullable().optional(),
    is_free_shipping: z.boolean().optional(),
    fixed_cost_shipping_price: z.number().nullable().optional(),
    purchasing_disabled: z.boolean().optional(),
    purchasing_disabled_message: z.string().optional(),
    upc: z.string().optional(),
    inventory_level: z.number().optional(),
    inventory_warning_level: z.number().optional(),
    bin_picking_number: z.string().optional(),
    mpn: z.string().optional(),
    gtin: z.string().optional(),
    option_values: z.array(z.object({}).passthrough()).optional()
});

const VariantModelSchema = z.object({
    id: z.string(),
    product_id: z.number(),
    sku: z.string().optional(),
    price: z.number().optional(),
    calculated_price: z.number().optional(),
    sale_price: z.number().optional(),
    retail_price: z.number().optional(),
    map_price: z.number().optional(),
    weight: z.number().optional(),
    calculated_weight: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    depth: z.number().optional(),
    is_free_shipping: z.boolean().optional(),
    fixed_cost_shipping_price: z.number().optional(),
    purchasing_disabled: z.boolean().optional(),
    purchasing_disabled_message: z.string().optional(),
    upc: z.string().optional(),
    inventory_level: z.number().optional(),
    inventory_warning_level: z.number().optional(),
    bin_picking_number: z.string().optional(),
    mpn: z.string().optional(),
    gtin: z.string().optional(),
    option_values: z.array(z.object({}).passthrough()).optional()
});

const VariantResponseSchema = z.object({
    data: z.array(VariantSchema),
    meta: z
        .object({
            pagination: PaginationSchema.optional()
        })
        .optional()
});

const CheckpointSchema = z.object({
    product_page: z.number().int().positive(),
    product_id: z.number().int().nonnegative(),
    variant_page: z.number().int().positive()
});

function getNextPage(nextLink: string | undefined): number | undefined {
    if (!nextLink) {
        return undefined;
    }

    const searchParams = nextLink.startsWith('?') ? new URLSearchParams(nextLink) : new URL(nextLink, 'https://api.bigcommerce.com').searchParams;
    const page = searchParams.get('page');

    if (!page) {
        return undefined;
    }

    const parsedPage = Number(page);
    return Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : undefined;
}

const sync = createSync({
    description: 'Sync product variants across all products',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    endpoints: [
        {
            path: '/syncs/variants',
            method: 'GET'
        }
    ],
    models: {
        Variant: VariantModelSchema
    },

    exec: async (nango) => {
        const checkpoint = CheckpointSchema.parse((await nango.getCheckpoint()) ?? { product_page: 1, product_id: 0, variant_page: 1 });
        let productPage = checkpoint.product_page;
        let resumeProductId = checkpoint.product_id > 0 ? checkpoint.product_id : undefined;
        let resumeVariantPage = checkpoint.variant_page;

        // Blocker: the BigCommerce variants endpoint does not expose an incremental
        // filter (no modified_after or updated_since). We must crawl every product
        // and every variant page on each run, so we use full-refresh delete tracking.
        // Only start delete tracking when beginning from the very first product page;
        // resuming mid-run would skip earlier pages and falsely delete those variants.
        const isFullRun = checkpoint.product_page === 1 && checkpoint.product_id === 0;
        if (isFullRun) {
            await nango.trackDeletesStart('Variant');
        }

        while (true) {
            // https://developer.bigcommerce.com/docs/rest-management/catalog/products
            const productResponse = await nango.get({
                endpoint: '/v3/catalog/products',
                params: {
                    page: String(productPage),
                    limit: '50'
                },
                retries: 3
            });

            const parsedProductResponse = ProductResponseSchema.parse(productResponse.data);
            const products = parsedProductResponse.data;

            if (products.length === 0) {
                break;
            }

            const checkpointProductId = resumeProductId;
            const checkpointVariantPage = resumeVariantPage;
            resumeProductId = undefined;
            resumeVariantPage = 1;

            const resumeIndex = checkpointProductId === undefined ? 0 : products.findIndex((product) => product.id === checkpointProductId);
            const productsToProcess = resumeIndex >= 0 ? products.slice(resumeIndex) : products;

            for (const product of productsToProcess) {
                let variantPage = checkpointProductId !== undefined && product.id === checkpointProductId ? checkpointVariantPage : 1;

                await nango.saveCheckpoint({
                    product_page: productPage,
                    product_id: product.id,
                    variant_page: variantPage
                });

                // https://developer.bigcommerce.com/docs/rest-management/catalog/variants
                while (true) {
                    const variantResponse = await nango.get({
                        endpoint: `/v3/catalog/products/${encodeURIComponent(String(product.id))}/variants`,
                        params: {
                            page: String(variantPage),
                            limit: '50'
                        },
                        retries: 3
                    });

                    const parsedVariantResponse = VariantResponseSchema.parse(variantResponse.data);
                    const variants = parsedVariantResponse.data;
                    const models = variants.map((variant) => ({
                        id: String(variant.id),
                        product_id: variant.product_id,
                        sku: variant.sku,
                        ...(variant.price != null && { price: variant.price }),
                        ...(variant.calculated_price != null && { calculated_price: variant.calculated_price }),
                        ...(variant.sale_price != null && { sale_price: variant.sale_price }),
                        ...(variant.retail_price != null && { retail_price: variant.retail_price }),
                        ...(variant.map_price != null && { map_price: variant.map_price }),
                        ...(variant.weight != null && { weight: variant.weight }),
                        ...(variant.calculated_weight != null && { calculated_weight: variant.calculated_weight }),
                        ...(variant.width != null && { width: variant.width }),
                        ...(variant.height != null && { height: variant.height }),
                        ...(variant.depth != null && { depth: variant.depth }),
                        is_free_shipping: variant.is_free_shipping,
                        ...(variant.fixed_cost_shipping_price != null && { fixed_cost_shipping_price: variant.fixed_cost_shipping_price }),
                        purchasing_disabled: variant.purchasing_disabled,
                        purchasing_disabled_message: variant.purchasing_disabled_message,
                        upc: variant.upc,
                        inventory_level: variant.inventory_level,
                        inventory_warning_level: variant.inventory_warning_level,
                        bin_picking_number: variant.bin_picking_number,
                        mpn: variant.mpn,
                        gtin: variant.gtin,
                        option_values: variant.option_values
                    }));

                    if (models.length > 0) {
                        await nango.batchSave(models, 'Variant');
                    }

                    const nextVariantPage = getNextPage(parsedVariantResponse.meta?.pagination?.links?.next);
                    if (!nextVariantPage) {
                        break;
                    }

                    variantPage = nextVariantPage;
                    await nango.saveCheckpoint({
                        product_page: productPage,
                        product_id: product.id,
                        variant_page: variantPage
                    });
                }
            }

            const nextProductPage = getNextPage(parsedProductResponse.meta?.pagination?.links?.next);
            if (!nextProductPage) {
                break;
            }

            productPage = nextProductPage;
            await nango.saveCheckpoint({ product_page: productPage, product_id: 0, variant_page: 1 });
        }

        if (isFullRun) {
            await nango.trackDeletesEnd('Variant');
        }
        await nango.saveCheckpoint({ product_page: 1, product_id: 0, variant_page: 1 });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
