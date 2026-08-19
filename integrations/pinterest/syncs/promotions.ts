import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const AdAccountSchema = z.object({
    id: z.string()
});

const PromotionSchema = z.object({
    id: z.string(),
    ad_account_id: z.string(),
    discount_status: z.string().optional(),
    end_time: z.number().optional(),
    external_id: z.string().optional(),
    platform_type: z.string().optional(),
    promotion_code: z.string().optional(),
    promotion_custom_id: z.string().optional(),
    promotion_title: z.string(),
    promotion_type: z.string(),
    start_time: z.number().optional(),
    status: z.string().optional(),
    template_values: z
        .array(
            z.object({
                amount: z.number().optional(),
                currency_code: z.string().optional(),
                custom_text: z.string().optional(),
                percent: z.number().optional()
            })
        )
        .optional()
});

const CheckpointSchema = z.object({
    ad_account_id: z.string(),
    bookmark: z.string()
});

const sync = createSync({
    description: 'Sync Shopping ad promotions',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Promotion: PromotionSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointResult = CheckpointSchema.safeParse(rawCheckpoint ?? { ad_account_id: '', bookmark: '' });
        const checkpoint = checkpointResult.success ? checkpointResult.data : { ad_account_id: '', bookmark: '' };

        const adAccounts: Array<{ id: string }> = [];
        const adAccountProxyConfig: ProxyConfiguration = {
            // https://developers.pinterest.com/docs/api/v5/#operation/ad_accounts/list
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

        for await (const page of nango.paginate(adAccountProxyConfig)) {
            for (const item of page) {
                const parsed = AdAccountSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse ad account: ${parsed.error.message}`);
                }
                adAccounts.push(parsed.data);
            }
        }

        // Blocker: Pinterest promotions endpoint does not expose an updated_after
        // filter, a changed-records feed, or a deleted-record endpoint. It only
        // supports cursor pagination per ad account, so a checkpointed full refresh
        // is required for resumability.
        await nango.trackDeletesStart('Promotion');

        // Sort by a stable key so checkpoint resume position is consistent even if the
        // provider returns ad accounts in a different order across runs.
        adAccounts.sort((a, b) => a.id.localeCompare(b.id));

        let startIndex = 0;
        let resumeBookmark: string | undefined;
        if (checkpoint.ad_account_id !== '') {
            const foundIndex = adAccounts.findIndex((a) => a.id === checkpoint.ad_account_id);
            if (foundIndex !== -1) {
                startIndex = foundIndex;
                resumeBookmark = checkpoint.bookmark !== '' ? checkpoint.bookmark : undefined;
            }
        }

        for (let i = startIndex; i < adAccounts.length; i++) {
            const adAccount = adAccounts[i];
            if (!adAccount) {
                break;
            }

            let nextBookmark: string | undefined = resumeBookmark;
            resumeBookmark = undefined;

            const promotionProxyConfig: ProxyConfiguration = {
                // https://developers.pinterest.com/docs/api/v5/#operation/promotions/list
                endpoint: `/v5/ad_accounts/${encodeURIComponent(adAccount.id)}/promotions`,
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

            for await (const page of nango.paginate(promotionProxyConfig)) {
                const promotions = [];
                for (const item of page) {
                    const parsed = PromotionSchema.safeParse(item);
                    if (!parsed.success) {
                        throw new Error(`Failed to parse promotion: ${parsed.error.message}`);
                    }
                    promotions.push({
                        id: parsed.data.id,
                        ad_account_id: parsed.data.ad_account_id,
                        discount_status: parsed.data.discount_status,
                        end_time: parsed.data.end_time,
                        external_id: parsed.data.external_id,
                        platform_type: parsed.data.platform_type,
                        promotion_code: parsed.data.promotion_code,
                        promotion_custom_id: parsed.data.promotion_custom_id,
                        promotion_title: parsed.data.promotion_title,
                        promotion_type: parsed.data.promotion_type,
                        start_time: parsed.data.start_time,
                        status: parsed.data.status,
                        template_values: parsed.data.template_values
                    });
                }

                if (promotions.length > 0) {
                    await nango.batchSave(promotions, 'Promotion');
                }

                if (nextBookmark !== undefined) {
                    await nango.saveCheckpoint({
                        ad_account_id: adAccount.id,
                        bookmark: nextBookmark
                    });
                }
            }

            const nextAdAccount = adAccounts[i + 1];
            if (nextAdAccount) {
                await nango.saveCheckpoint({
                    ad_account_id: nextAdAccount.id,
                    bookmark: ''
                });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Promotion');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
