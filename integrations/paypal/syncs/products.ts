import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderProductSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    type: z.string().optional(),
    category: z.string().optional(),
    image_url: z.string().optional(),
    home_url: z.string().optional(),
    create_time: z.string().optional(),
    update_time: z.string().optional()
});

const ProductSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    type: z.string().optional(),
    category: z.string().optional(),
    image_url: z.string().optional(),
    home_url: z.string().optional(),
    create_time: z.string().optional(),
    update_time: z.string().optional()
});

const CheckpointSchema = z.object({
    page: z.number().int().positive()
});

const sync = createSync({
    description: 'Sync products.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Product: ProductSchema
    },

    exec: async (nango) => {
        // Blocker: PayPal Catalog Products list only supports page-based pagination with no changed-since
        // filter and no deleted-record endpoint, so every run must page through the entire catalog. The page
        // checkpoint below lets a run that's interrupted (large catalog, execution time limit) resume
        // pagination instead of restarting from page 1; trackDeletesStart is safe/idempotent to call again on
        // a resumed run, and trackDeletesEnd only fires once the full catalog has actually been enumerated.
        const checkpoint = await nango.getCheckpoint();
        let page = checkpoint?.page ?? 1;

        await nango.trackDeletesStart('Product');

        const proxyConfig: ProxyConfiguration = {
            // https://developer.paypal.com/api/catalog-products/v1/#products-list
            endpoint: '/v1/catalogs/products',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_calculation_method: 'per-page',
                offset_start_value: page,
                limit_name_in_request: 'page_size',
                limit: 20,
                response_path: 'products',
                on_page: async ({ nextPageParam }) => {
                    // For offset/per-page pagination, nextPageParam is the offset of the page that was just
                    // fetched and (by the for-await protocol) already saved, so the resume cursor is one past it.
                    page = typeof nextPageParam === 'number' ? nextPageParam + 1 : page;
                    await nango.saveCheckpoint({ page });
                }
            },
            retries: 3
        };

        for await (const batch of nango.paginate(proxyConfig)) {
            const products = batch.map((item: unknown) => {
                const parsed = ProviderProductSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Invalid product record: ${JSON.stringify(parsed.error.issues)}`);
                }

                const record = parsed.data;
                return {
                    id: record.id,
                    ...(record.name !== undefined && { name: record.name }),
                    ...(record.description !== undefined && { description: record.description }),
                    ...(record.type !== undefined && { type: record.type }),
                    ...(record.category !== undefined && { category: record.category }),
                    ...(record.image_url !== undefined && { image_url: record.image_url }),
                    ...(record.home_url !== undefined && { home_url: record.home_url }),
                    ...(record.create_time !== undefined && { create_time: record.create_time }),
                    ...(record.update_time !== undefined && { update_time: record.update_time })
                };
            });

            if (products.length > 0) {
                await nango.batchSave(products, 'Product');
            }
        }

        await nango.trackDeletesEnd('Product');
        // Full catalog enumerated: reset the cursor so the next scheduled run starts a fresh pass from page 1.
        await nango.saveCheckpoint({ page: 1 });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
