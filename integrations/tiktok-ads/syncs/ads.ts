import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderAdSchema = z.object({
    ad_id: z.string(),
    ad_name: z.string().nullish(),
    campaign_id: z.string().nullish(),
    adgroup_id: z.string().nullish(),
    status: z.string().nullish(),
    operation_status: z.string().nullish(),
    create_time: z.string().nullish(),
    modify_time: z.string().nullish()
});

const AdSchema = z.object({
    id: z.string(),
    ad_id: z.string().optional(),
    ad_name: z.string().optional(),
    campaign_id: z.string().optional(),
    adgroup_id: z.string().optional(),
    status: z.string().optional(),
    operation_status: z.string().optional(),
    create_time: z.string().optional(),
    modify_time: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    page: z.number()
});

const MetadataSchema = z.object({
    advertiser_id: z.string()
});

const sync = createSync({
    description: 'Sync ads from TikTok Ads.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        Ad: AdSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/ads'
        }
    ],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let updatedAfter = '1970-01-01T00:00:00Z';
        let page: number | undefined = 1;
        let lastProcessedModifyTime: string | undefined;

        if (checkpoint) {
            const parsedCheckpoint = CheckpointSchema.safeParse(checkpoint);
            if (!parsedCheckpoint.success) {
                throw new Error(`Invalid checkpoint: ${parsedCheckpoint.error.message}`);
            }
            updatedAfter = parsedCheckpoint.data.updated_after;
            page = parsedCheckpoint.data.page;
        }

        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);
        if (!parsedMetadata.success) {
            throw new Error(`Invalid metadata: ${parsedMetadata.error.message}`);
        }
        const advertiserId = parsedMetadata.data.advertiser_id;

        const proxyConfig: ProxyConfiguration = {
            // https://business-api.tiktok.com/portal/docs?id=1735735588640770
            endpoint: '/ad/get/',
            params: {
                advertiser_id: advertiserId,
                ...(updatedAfter && { filtering: JSON.stringify({ modified_after: updatedAfter }) })
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: page,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'page_size',
                limit: 100,
                response_path: 'data.list',
                on_page: async ({ nextPageParam }) => {
                    page = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const pageResults of nango.paginate(proxyConfig)) {
            const validated = z.array(ProviderAdSchema).safeParse(pageResults);
            if (!validated.success) {
                throw new Error(`Failed to parse ads response: ${validated.error.message}`);
            }

            const ads = validated.data.map((record) => ({
                id: record.ad_id,
                ...(record.ad_name != null && { ad_name: record.ad_name }),
                ...(record.campaign_id != null && { campaign_id: record.campaign_id }),
                ...(record.adgroup_id != null && { adgroup_id: record.adgroup_id }),
                ...(record.status != null && { status: record.status }),
                ...(record.operation_status != null && { operation_status: record.operation_status }),
                ...(record.create_time != null && { create_time: record.create_time }),
                ...(record.modify_time != null && { modify_time: record.modify_time })
            }));

            if (ads.length === 0) {
                if (page === undefined && lastProcessedModifyTime) {
                    await nango.saveCheckpoint({
                        updated_after: lastProcessedModifyTime,
                        page: 1
                    });
                }
                continue;
            }

            await nango.batchSave(ads, 'Ad');

            // Track the maximum modify_time seen across all ads in this page.
            // API ordering is not guaranteed, so we cannot rely on the last record.
            for (const ad of ads) {
                if (ad.modify_time && (!lastProcessedModifyTime || ad.modify_time > lastProcessedModifyTime)) {
                    lastProcessedModifyTime = ad.modify_time;
                }
            }

            if (!lastProcessedModifyTime) {
                throw new Error('Missing modify_time on all ads of page; cannot save checkpoint');
            }

            if (page !== undefined) {
                await nango.saveCheckpoint({
                    updated_after: updatedAfter,
                    page
                });
                continue;
            }

            updatedAfter = lastProcessedModifyTime;
            await nango.saveCheckpoint({
                updated_after: updatedAfter,
                page: 1
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
