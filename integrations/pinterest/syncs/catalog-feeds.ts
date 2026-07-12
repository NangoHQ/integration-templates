import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CatalogFeedSchema = z.object({
    id: z.string(),
    catalog_type: z.enum(['RETAIL', 'HOTEL', 'CREATIVE_ASSETS']).optional(),
    catalog_id: z.string().nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    credentials: z
        .object({
            username: z.string().optional(),
            password: z.string().optional()
        })
        .nullable()
        .optional(),
    default_availability: z.enum(['IN_STOCK', 'OUT_OF_STOCK', 'PREORDER']).nullable().optional(),
    default_country: z.string().optional(),
    default_currency: z.string().nullable().optional(),
    default_locale: z.string().optional(),
    format: z.enum(['TSV', 'CSV', 'XML', 'INTEGRATION']).optional(),
    location: z.string().optional(),
    name: z.string().nullable().optional(),
    preferred_processing_schedule: z
        .object({
            time: z.string().optional(),
            timezone: z.string().optional()
        })
        .nullable()
        .optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional()
});

const sync = createSync({
    description: 'Sync catalog data feeds.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        CatalogFeed: CatalogFeedSchema
    },

    exec: async (nango) => {
        // Catalog feeds can be hard-deleted and the endpoint exposes no incremental filter.
        // Run a full crawl on every successful sync so delete tracking remains accurate.
        const proxyConfig: ProxyConfiguration = {
            // https://developers.pinterest.com/docs/api/v5/#operation/feeds/list
            endpoint: '/v5/catalogs/feeds',
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'bookmark',
                cursor_path_in_response: 'bookmark',
                response_path: 'items',
                limit_name_in_request: 'page_size',
                limit: 25
            },
            retries: 3
        };

        await nango.trackDeletesStart('CatalogFeed');

        for await (const page of nango.paginate(proxyConfig)) {
            const feeds = page.map((feed) => {
                const parsed = CatalogFeedSchema.safeParse(feed);
                if (!parsed.success) {
                    throw new Error(`Failed to parse catalog feed: ${parsed.error.message}`);
                }
                return parsed.data;
            });

            if (feeds.length > 0) {
                await nango.batchSave(feeds, 'CatalogFeed');
            }
        }

        await nango.trackDeletesEnd('CatalogFeed');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
