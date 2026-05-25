import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProductCategoryImageSchema = z.object({
    id: z.number().optional(),
    date_created: z.string().optional(),
    date_created_gmt: z.string().optional(),
    date_modified: z.string().optional(),
    date_modified_gmt: z.string().optional(),
    src: z.string().optional(),
    name: z.string().optional(),
    alt: z.string().optional()
});

const ProductCategorySchema = z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string().optional(),
    parent: z.number().optional(),
    description: z.string().optional(),
    display: z.string().optional(),
    image: ProductCategoryImageSchema.optional(),
    menu_order: z.number().optional(),
    count: z.number().optional()
});

const ProviderProductCategorySchema = z.object({
    id: z.number(),
    name: z.string(),
    slug: z.string().optional(),
    parent: z.number().optional(),
    description: z.string().optional(),
    display: z.string().optional(),
    image: z.union([z.array(z.unknown()), ProductCategoryImageSchema, z.null()]).optional(),
    menu_order: z.number().optional(),
    count: z.number().optional()
});

const sync = createSync({
    description: 'Sync product categories from WooCommerce.',
    version: '1.0.0',
    endpoints: [{ method: 'GET', path: '/syncs/product-categories' }],
    frequency: 'every hour',
    autoStart: true,
    models: {
        ProductCategory: ProductCategorySchema
    },

    exec: async (nango) => {
        // Blocker: The WooCommerce product categories API does not expose change timestamps,
        // modification filters, or resumable cursors. The endpoint only supports basic
        // page/offset pagination with no incremental filtering.
        await nango.trackDeletesStart('ProductCategory');

        const proxyConfig: ProxyConfiguration = {
            // https://woocommerce.github.io/woocommerce-rest-api-docs/#list-all-product-categories
            endpoint: '/wp-json/wc/v3/products/categories',
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

        for await (const page of nango.paginate(proxyConfig)) {
            const parsedRecords = page.map((item) => {
                const parsed = ProviderProductCategorySchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse product category: ${parsed.error.message}`);
                }
                return parsed.data;
            });

            const categories = parsedRecords.map((record) => ({
                id: String(record.id),
                name: record.name,
                ...(record.slug !== undefined && { slug: record.slug }),
                ...(record.parent !== undefined && { parent: record.parent }),
                ...(record.description !== undefined && { description: record.description }),
                ...(record.display !== undefined && { display: record.display }),
                ...(record.image !== undefined && record.image !== null && !Array.isArray(record.image) && { image: record.image }),
                ...(record.menu_order !== undefined && { menu_order: record.menu_order }),
                ...(record.count !== undefined && { count: record.count })
            }));

            if (categories.length > 0) {
                await nango.batchSave(categories, 'ProductCategory');
            }
        }

        await nango.trackDeletesEnd('ProductCategory');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
