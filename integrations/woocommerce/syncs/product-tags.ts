import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProductTagSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    slug: z.string().optional(),
    description: z.string().optional(),
    count: z.number().optional()
});

const ProviderTagSchema = z.object({
    id: z.number(),
    name: z.string().nullable().optional(),
    slug: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    count: z.number().nullable().optional()
});

const CheckpointSchema = z.object({
    page: z.number()
});

const sync = createSync({
    description: 'Sync product tags from WooCommerce.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        ProductTag: ProductTagSchema
    },
    endpoints: [
        // https://woocommerce.github.io/woocommerce-rest-api-docs/#list-all-product-tags
        {
            method: 'GET',
            path: '/syncs/product-tags'
        }
    ],

    exec: async (nango) => {
        // Blocker: WooCommerce product tags endpoint does not support updated_after,
        // modified_since, since_id, after, or before filters. There is no deleted-record
        // endpoint for tags. Full refresh is required.
        const checkpoint = await nango.getCheckpoint();
        let page: number | undefined = typeof checkpoint?.['page'] === 'number' ? checkpoint['page'] : 1;

        await nango.trackDeletesStart('ProductTag');

        const proxyConfig: ProxyConfiguration = {
            // https://woocommerce.github.io/woocommerce-rest-api-docs/#list-all-product-tags
            endpoint: '/wp-json/wc/v3/products/tags',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: page ?? 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    page = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const pageResults of nango.paginate(proxyConfig)) {
            const parsed = z.array(ProviderTagSchema).parse(pageResults);

            const tags = parsed.map((raw) => ({
                id: String(raw.id),
                ...(raw.name != null && { name: raw.name }),
                ...(raw.slug != null && { slug: raw.slug }),
                ...(raw.description != null && { description: raw.description }),
                ...(raw.count != null && { count: raw.count })
            }));

            if (tags.length > 0) {
                await nango.batchSave(tags, 'ProductTag');
            }

            if (page !== undefined) {
                await nango.saveCheckpoint({ page });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('ProductTag');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
