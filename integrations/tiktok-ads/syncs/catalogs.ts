import { createSync, type ProxyConfiguration } from 'nango';
import * as z from 'zod';

const FeedSchema = z.object({
    feed_id: z.string(),
    feed_name: z.string().optional(),
    update_mode: z.string().optional(),
    schedule_param: z.unknown().optional(),
    feed_status: z.string().optional()
});

const CatalogSchema = z.object({
    id: z.string(),
    catalog_id: z.string(),
    name: z.string().optional(),
    catalog_type: z.string().optional(),
    catalog_vertical: z.string().optional(),
    catalog_status: z.string().optional(),
    store_id: z.string().optional(),
    create_time: z.string().optional(),
    update_time: z.string().optional(),
    feeds: z.array(FeedSchema).optional()
});

const MetadataSchema = z.object({
    advertiser_id: z.string(),
    bc_id: z.string().optional()
});

const CatalogItemSchema = z.object({
    catalog_id: z.string(),
    name: z.string().optional(),
    catalog_type: z.string().optional(),
    catalog_vertical: z.string().optional(),
    catalog_status: z.string().optional(),
    store_id: z.string().optional(),
    create_time: z.string().optional(),
    update_time: z.string().optional()
});

const FeedResponseSchema = z.object({
    data: z
        .object({
            list: z.array(z.unknown()).optional()
        })
        .optional()
});

const sync = createSync({
    description: 'Sync product catalogs and their feeds from TikTok Ads',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    metadata: MetadataSchema,
    endpoints: [{ method: 'POST', path: '/syncs/catalogs' }],
    models: {
        Catalog: CatalogSchema
    },

    exec: async (nango) => {
        const metadata = await nango.getMetadata<z.infer<typeof MetadataSchema>>();

        if (!metadata?.advertiser_id) {
            throw new Error('advertiser_id is required in metadata');
        }

        const bcId = metadata.bc_id ?? metadata.advertiser_id;

        await nango.trackDeletesStart('Catalog');

        const catalogProxyConfig: ProxyConfiguration = {
            // https://business-api.tiktok.com/portal/docs?id=1740315452868610
            endpoint: 'catalog/get/',
            baseUrlOverride: 'https://sandbox-ads.tiktok.com/open_api/v1.3/',
            params: {
                bc_id: bcId,
                page: '1',
                page_size: '10'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'page_size',
                limit: 10,
                response_path: 'data.list'
            },
            retries: 3
        };

        const catalogs: Array<z.infer<typeof CatalogSchema>> = [];

        for await (const page of nango.paginate(catalogProxyConfig)) {
            if (!Array.isArray(page)) {
                throw new Error('Expected catalog page to be an array');
            }

            for (const rawCatalog of page) {
                const catalogParse = CatalogItemSchema.safeParse(rawCatalog);
                if (!catalogParse.success) {
                    throw new Error('Failed to parse catalog item');
                }

                const catalog = catalogParse.data;

                const feedProxyConfig: ProxyConfiguration = {
                    // https://business-api.tiktok.com/portal/docs?id=1740665183073281
                    endpoint: 'catalog/feed/get/',
                    baseUrlOverride: 'https://sandbox-ads.tiktok.com/open_api/v1.3/',
                    params: {
                        catalog_id: catalog.catalog_id,
                        bc_id: bcId
                    },
                    retries: 3
                };

                const feedResponse = await nango.get(feedProxyConfig);
                const feedParse = FeedResponseSchema.safeParse(feedResponse.data);

                let feeds: Array<z.infer<typeof FeedSchema>> = [];
                if (feedParse.success) {
                    const feedList = feedParse.data.data?.list ?? [];
                    feeds = feedList
                        .map((rawFeed) => {
                            const feedItemParse = FeedSchema.safeParse(rawFeed);
                            return feedItemParse.success ? feedItemParse.data : null;
                        })
                        .filter((feed): feed is z.infer<typeof FeedSchema> => feed !== null);
                }

                catalogs.push({
                    id: catalog.catalog_id,
                    catalog_id: catalog.catalog_id,
                    name: catalog.name,
                    catalog_type: catalog.catalog_type,
                    catalog_vertical: catalog.catalog_vertical,
                    catalog_status: catalog.catalog_status,
                    store_id: catalog.store_id,
                    create_time: catalog.create_time,
                    update_time: catalog.update_time,
                    feeds: feeds.length > 0 ? feeds : undefined
                });
            }
        }

        if (catalogs.length > 0) {
            await nango.batchSave(catalogs, 'Catalog');
        }

        await nango.trackDeletesEnd('Catalog');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
