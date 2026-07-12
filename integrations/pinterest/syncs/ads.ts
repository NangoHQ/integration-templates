import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const AdAccountResponseSchema = z.object({
    id: z.string().describe('Ad account ID')
});

const AdResponseSchema = z.object({
    id: z.string().describe('Ad ID'),
    ad_account_id: z.string().optional().describe('ID of the advertiser that this ad belongs to'),
    ad_group_id: z.string().describe('ID of the ad group that contains the ad'),
    campaign_id: z.string().describe('ID of the ad campaign that contains this ad'),
    pin_id: z.string().describe('Pin ID'),
    name: z.string().nullable().optional().describe('Name of the ad'),
    status: z.string().optional().describe('Entity status'),
    creative_type: z.string().describe('Creative type'),
    review_status: z.string().optional().describe('Ad review status'),
    summary_status: z.string().optional().describe('Ad summary status'),
    created_time: z.number().optional().describe('Pin creation time. Unix timestamp in seconds'),
    updated_time: z.number().optional().describe('Last update time. Unix timestamp in seconds'),
    type: z.string().optional().describe('Always "ad"')
});

const AdSchema = z.object({
    id: z.string().describe('Ad ID'),
    ad_account_id: z.string().describe('Ad account ID'),
    ad_group_id: z.string().describe('Ad group ID'),
    campaign_id: z.string().describe('Campaign ID'),
    pin_id: z.string().describe('Pin ID'),
    name: z.string().optional().describe('Name of the ad'),
    status: z.string().optional().describe('Entity status'),
    creative_type: z.string().describe('Creative type'),
    review_status: z.string().optional().describe('Ad review status'),
    summary_status: z.string().optional().describe('Ad summary status'),
    created_time: z.number().optional().describe('Pin creation time. Unix timestamp in seconds'),
    updated_time: z.number().optional().describe('Last update time. Unix timestamp in seconds'),
    type: z.string().optional().describe('Always "ad"')
});

const CheckpointSchema = z.object({
    ad_account_id: z.string(),
    bookmark: z.string()
});

const sync = createSync({
    description: 'Sync ads.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Ad: AdSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointResult = CheckpointSchema.safeParse(rawCheckpoint ?? { ad_account_id: '', bookmark: '' });
        const checkpoint = checkpointResult.success ? checkpointResult.data : { ad_account_id: '', bookmark: '' };

        const adAccountsConfig: ProxyConfiguration = {
            // https://developers.pinterest.com/docs/api/v5/#tag/ad_accounts/operation/ad_accounts/list
            endpoint: '/v5/ad_accounts',
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'bookmark',
                cursor_path_in_response: 'bookmark',
                response_path: 'items',
                limit_name_in_request: 'page_size',
                limit: 100
            },
            retries: 3
        };

        await nango.trackDeletesStart('Ad');

        const adAccountIds: string[] = [];
        for await (const page of nango.paginate(adAccountsConfig)) {
            for (const raw of page) {
                const parsed = AdAccountResponseSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse ad account: ${parsed.error.message}`);
                }
                adAccountIds.push(parsed.data.id);
            }
        }

        // Sort by a stable key so checkpoint resume position is consistent even if the
        // provider returns ad accounts in a different order across runs.
        adAccountIds.sort();

        // Ads are archived via status rather than hard-deleted, so a saved bookmark is safe
        // to use as a resumable page checkpoint between failed runs.
        let startIndex = 0;
        let resumeBookmark: string | undefined;
        if (checkpoint.ad_account_id !== '') {
            const foundIndex = adAccountIds.findIndex((adAccountId) => adAccountId === checkpoint.ad_account_id);
            if (foundIndex >= 0) {
                startIndex = foundIndex;
                resumeBookmark = checkpoint.bookmark !== '' ? checkpoint.bookmark : undefined;
            }
        }

        for (let i = startIndex; i < adAccountIds.length; i++) {
            const adAccountId = adAccountIds[i];
            if (!adAccountId) {
                break;
            }

            let nextBookmark = resumeBookmark;
            resumeBookmark = undefined;

            const adsConfig: ProxyConfiguration = {
                // https://developers.pinterest.com/docs/api/v5/#tag/ads/operation/ads/list
                endpoint: `/v5/ad_accounts/${encodeURIComponent(adAccountId)}/ads`,
                params: {
                    ...(nextBookmark && { bookmark: nextBookmark })
                },
                paginate: {
                    type: 'cursor',
                    cursor_name_in_request: 'bookmark',
                    cursor_path_in_response: 'bookmark',
                    response_path: 'items',
                    limit_name_in_request: 'page_size',
                    limit: 100,
                    on_page: async ({ nextPageParam }) => {
                        nextBookmark = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                    }
                },
                retries: 3
            };

            for await (const page of nango.paginate(adsConfig)) {
                const ads = [];
                for (const raw of page) {
                    const parsed = AdResponseSchema.safeParse(raw);
                    if (!parsed.success) {
                        throw new Error(`Failed to parse ad: ${parsed.error.message}`);
                    }
                    const ad = parsed.data;
                    ads.push({
                        id: ad.id,
                        ad_account_id: ad.ad_account_id ?? adAccountId,
                        ad_group_id: ad.ad_group_id,
                        campaign_id: ad.campaign_id,
                        pin_id: ad.pin_id,
                        creative_type: ad.creative_type,
                        ...(ad.name != null && { name: ad.name }),
                        ...(ad.status != null && { status: ad.status }),
                        ...(ad.review_status != null && { review_status: ad.review_status }),
                        ...(ad.summary_status != null && { summary_status: ad.summary_status }),
                        ...(ad.created_time != null && { created_time: ad.created_time }),
                        ...(ad.updated_time != null && { updated_time: ad.updated_time }),
                        ...(ad.type != null && { type: ad.type })
                    });
                }

                if (ads.length > 0) {
                    await nango.batchSave(ads, 'Ad');
                }

                await nango.saveCheckpoint({
                    ad_account_id: adAccountId,
                    bookmark: nextBookmark ?? ''
                });
            }

            const nextAdAccountId = adAccountIds[i + 1];
            if (nextAdAccountId) {
                await nango.saveCheckpoint({
                    ad_account_id: nextAdAccountId,
                    bookmark: ''
                });
            }
        }

        await nango.trackDeletesEnd('Ad');
        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
