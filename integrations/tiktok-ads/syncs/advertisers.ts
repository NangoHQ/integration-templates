import { createSync } from 'nango';
import { z } from 'zod';

const AdvertiserSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    status: z.string().optional(),
    country: z.string().optional(),
    currency: z.string().optional(),
    timezone: z.string().optional(),
    advertiser_account_type: z.string().optional(),
    create_time: z.number().optional()
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    data: z.object({
        list: z.array(
            z.object({
                advertiser_id: z.union([z.string(), z.number()]),
                name: z.string().nullable().optional(),
                status: z.string().nullable().optional(),
                country: z.string().nullable().optional(),
                currency: z.string().nullable().optional(),
                timezone: z.string().nullable().optional(),
                advertiser_account_type: z.string().nullable().optional(),
                create_time: z.number().nullable().optional()
            })
        )
    })
});

const sync = createSync({
    description: 'Sync advertisers from TikTok Ads.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ method: 'GET', path: '/syncs/advertisers' }],
    models: {
        Advertiser: AdvertiserSchema
    },

    exec: async (nango) => {
        const connection = await nango.getConnection();
        const advertiserId = connection.connection_config?.['advertiser_id'] ?? '7644143197428744199';

        if (typeof advertiserId !== 'string') {
            throw new Error('advertiser_id must be a string');
        }

        // https://business-api.tiktok.com/portal/docs?id=1739593083610113
        const response = await nango.get({
            endpoint: 'advertiser/info/',
            params: {
                advertiser_ids: JSON.stringify([advertiserId])
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new Error(`Failed to parse advertiser response: ${parsed.error.message}`);
        }

        if (parsed.data.code !== 0) {
            throw new Error(`TikTok API error: ${parsed.data.message}`);
        }

        await nango.trackDeletesStart('Advertiser');

        const advertisers = parsed.data.data.list.map((item) => ({
            id: String(item.advertiser_id),
            ...(item.name != null && { name: item.name }),
            ...(item.status != null && { status: item.status }),
            ...(item.country != null && { country: item.country }),
            ...(item.currency != null && { currency: item.currency }),
            ...(item.timezone != null && { timezone: item.timezone }),
            ...(item.advertiser_account_type != null && { advertiser_account_type: item.advertiser_account_type }),
            ...(item.create_time != null && { create_time: item.create_time })
        }));

        if (advertisers.length > 0) {
            await nango.batchSave(advertisers, 'Advertiser');
        }

        await nango.trackDeletesEnd('Advertiser');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
