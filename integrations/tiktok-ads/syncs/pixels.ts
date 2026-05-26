import { createSync } from 'nango';
import { z } from 'zod';

const ConnectionConfigSchema = z.object({
    advertiser_id: z.string()
});

const ProviderPixelSchema = z.object({
    pixel_id: z.string(),
    pixel_name: z.string().optional(),
    pixel_code: z.string().optional(),
    pixel_category: z.string().optional(),
    create_time: z.string().optional(),
    activity_status: z.string().optional(),
    pixel_setup_mode: z.string().optional(),
    partner_name: z.string().nullable().optional()
});

const PageInfoSchema = z.object({
    page: z.number(),
    page_size: z.number(),
    total_number: z.number(),
    total_page: z.number()
});

const PixelListResponseSchema = z.object({
    code: z.number(),
    message: z.string().optional(),
    request_id: z.string().optional(),
    data: z.object({
        pixels: z.array(ProviderPixelSchema),
        page_info: PageInfoSchema
    })
});

const PixelSchema = z.object({
    id: z.string(),
    pixel_id: z.string().optional(),
    pixel_name: z.string().optional(),
    pixel_code: z.string().optional(),
    pixel_category: z.string().optional(),
    create_time: z.string().optional(),
    activity_status: z.string().optional(),
    pixel_setup_mode: z.string().optional(),
    partner_name: z.string().optional()
});

const sync = createSync({
    description: 'Sync pixels from TikTok Ads.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Pixel: PixelSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/pixels'
        }
    ],

    exec: async (nango) => {
        const connection = await nango.getConnection();
        const connectionConfig = ConnectionConfigSchema.safeParse(connection.connection_config);
        const advertiserId = connectionConfig.success ? connectionConfig.data.advertiser_id : '7644143197428744199';

        // Blocker: The TikTok pixel/list endpoint does not expose a changed-since filter,
        // cursor-based change feed, or deleted-record endpoint. It only supports optional
        // ID/code/name filters and page-based pagination, so a full refresh is required.
        await nango.trackDeletesStart('Pixel');

        for (let page = 1; page <= 1000; page++) {
            // https://business-api.tiktok.com/portal/docs?id=1740858697598978
            const response = await nango.get({
                endpoint: '/pixel/list/',
                baseUrlOverride: 'https://sandbox-ads.tiktok.com/open_api/v1.3/',
                params: {
                    advertiser_id: advertiserId,
                    page: page,
                    page_size: 20
                },
                retries: 3
            });

            const validated = PixelListResponseSchema.safeParse(response.data);
            if (!validated.success) {
                throw new Error(`Invalid API response: ${validated.error.message}`);
            }

            if (validated.data.code !== 0) {
                throw new Error(`TikTok API error ${validated.data.code}: ${validated.data.message ?? 'Unknown error'}`);
            }

            const items = validated.data.data.pixels;
            if (items.length === 0) {
                break;
            }

            const pixels = items.map((pixel) => ({
                id: pixel.pixel_id,
                ...(pixel.pixel_name != null && { pixel_name: pixel.pixel_name }),
                ...(pixel.pixel_code != null && { pixel_code: pixel.pixel_code }),
                ...(pixel.pixel_category != null && { pixel_category: pixel.pixel_category }),
                ...(pixel.create_time != null && { create_time: pixel.create_time }),
                ...(pixel.activity_status != null && { activity_status: pixel.activity_status }),
                ...(pixel.pixel_setup_mode != null && { pixel_setup_mode: pixel.pixel_setup_mode }),
                ...(pixel.partner_name != null && { partner_name: pixel.partner_name })
            }));

            await nango.batchSave(pixels, 'Pixel');

            const pageInfo = validated.data.data.page_info;
            if (page >= pageInfo.total_page) {
                break;
            }
        }

        await nango.trackDeletesEnd('Pixel');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
