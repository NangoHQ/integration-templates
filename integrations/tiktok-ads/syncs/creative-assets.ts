import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const _ProviderImageSchema = z.object({
    image_id: z.string(),
    image_url: z.string().optional(),
    file_name: z.string().optional(),
    format: z.string().optional(),
    height: z.number().optional(),
    width: z.number().optional(),
    size: z.number().optional(),
    create_time: z.string().optional(),
    modify_time: z.string().optional()
});

const CreativeAssetSchema = z.object({
    id: z.string(),
    image_id: z.string(),
    image_url: z.string().optional(),
    file_name: z.string().optional(),
    format: z.string().optional(),
    height: z.number().optional(),
    width: z.number().optional(),
    size: z.number().optional(),
    create_time: z.string().optional(),
    modify_time: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const sync = createSync<{ CreativeAsset: typeof CreativeAssetSchema }, never, typeof CheckpointSchema>({
    description: 'Sync creative assets from TikTok Ads.',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        CreativeAsset: CreativeAssetSchema
    },
    // https://business-api.tiktok.com/portal/docs?id=1740052016789506
    endpoints: [{ method: 'POST', path: '/syncs/creative-assets' }],
    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const advertiserId = '7644143197428744199';
        const updatedAfter = checkpoint?.updated_after;

        let maxModifyTime: string | undefined;

        const proxyConfig: ProxyConfiguration = {
            // https://business-api.tiktok.com/portal/docs?id=1740052016789506
            endpoint: 'file/image/ad/search/',
            baseUrlOverride: 'https://sandbox-ads.tiktok.com/open_api/v1.3/',
            params: {
                advertiser_id: advertiserId,
                page_size: 100
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
            retries: 3
        };

        for await (const batch of nango.paginate<z.infer<typeof _ProviderImageSchema>>(proxyConfig)) {
            const records = batch
                .filter((item) => {
                    if (!updatedAfter || !item.modify_time) {
                        return true;
                    }
                    return item.modify_time > updatedAfter;
                })
                .map((item) => ({
                    id: item.image_id,
                    image_id: item.image_id,
                    ...(item.image_url && { image_url: item.image_url }),
                    ...(item.file_name && { file_name: item.file_name }),
                    ...(item.format && { format: item.format }),
                    ...(item.height !== undefined && { height: item.height }),
                    ...(item.width !== undefined && { width: item.width }),
                    ...(item.size !== undefined && { size: item.size }),
                    ...(item.create_time && { create_time: item.create_time }),
                    ...(item.modify_time && { modify_time: item.modify_time })
                }));

            if (records.length > 0) {
                await nango.batchSave(records, 'CreativeAsset');

                for (const record of records) {
                    if (record.modify_time && (!maxModifyTime || record.modify_time > maxModifyTime)) {
                        maxModifyTime = record.modify_time;
                    }
                }
            }
        }

        if (maxModifyTime) {
            await nango.saveCheckpoint({ updated_after: maxModifyTime });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
