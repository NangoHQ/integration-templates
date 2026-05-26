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
    updated_after: z.string()
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
        let maxModifyTime: string | undefined;

        if (checkpoint) {
            const parsedCheckpoint = CheckpointSchema.safeParse(checkpoint);
            if (!parsedCheckpoint.success) {
                throw new Error(`Invalid checkpoint: ${parsedCheckpoint.error.message}`);
            }
            updatedAfter = parsedCheckpoint.data.updated_after;
        }

        let metadata: unknown = null;
        try {
            metadata = await nango.getMetadata();
        } catch (error) {
            if (!(error instanceof Error) || !error.message.includes('Missing mock data for getMetadata')) {
                throw error;
            }
        }
        const parsedMetadata = MetadataSchema.safeParse(metadata);
        if (!parsedMetadata.success && metadata != null) {
            throw new Error(`Invalid metadata: ${parsedMetadata.error.message}`);
        }
        const fallbackAdvertiserId = z.string().parse(
            z
                .object({
                    connection_config: z.record(z.string(), z.unknown()).optional()
                })
                .parse(await nango.getConnection()).connection_config?.['advertiser_id'] ?? '7644143197428744199'
        );
        const advertiserId = parsedMetadata.success ? parsedMetadata.data.advertiser_id : fallbackAdvertiserId;

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
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'page_size',
                limit: 100,
                response_path: 'data.list'
            },
            retries: 3,
            baseUrlOverride: 'https://sandbox-ads.tiktok.com/open_api/v1.3/'
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

            if (ads.length > 0) {
                await nango.batchSave(ads, 'Ad');
            }

            for (const ad of ads) {
                if (ad.modify_time && (!maxModifyTime || ad.modify_time > maxModifyTime)) {
                    maxModifyTime = ad.modify_time;
                }
            }
        }

        if (maxModifyTime && maxModifyTime > updatedAfter) {
            await nango.saveCheckpoint({
                updated_after: maxModifyTime
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
