import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CampaignSchema = z
    .object({
        id: z.string(),
        ad_account_id: z.string().nullable().optional(),
        name: z.string().nullable().optional(),
        status: z.string().nullable().optional(),
        summary_status: z.string().nullable().optional(),
        objective_type: z.string().nullable().optional(),
        created_time: z.number().nullable().optional(),
        updated_time: z.number().nullable().optional(),
        start_time: z.number().nullable().optional(),
        end_time: z.number().nullable().optional(),
        daily_spend_cap: z.number().nullable().optional(),
        lifetime_spend_cap: z.number().nullable().optional(),
        is_campaign_budget_optimization: z.boolean().nullable().optional(),
        is_flexible_daily_budgets: z.boolean().nullable().optional(),
        is_performance_plus: z.boolean().nullable().optional(),
        is_automated_campaign: z.boolean().nullable().optional(),
        is_ltv_optimized: z.boolean().nullable().optional(),
        is_top_of_search: z.boolean().nullable().optional(),
        is_carting: z.boolean().nullable().optional(),
        order_line_id: z.string().nullable().optional(),
        type: z.string().nullable().optional(),
        intended_promotion_type: z.string().nullable().optional()
    })
    .passthrough();

const AdAccountIdSchema = z.object({
    id: z.string()
});

const CheckpointSchema = z.object({
    ad_account_id: z.string(),
    bookmark: z.string()
});

const sync = createSync({
    description: 'Sync campaigns.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Campaign: CampaignSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointResult = CheckpointSchema.safeParse(rawCheckpoint ?? { ad_account_id: '', bookmark: '' });
        const checkpoint = checkpointResult.success ? checkpointResult.data : { ad_account_id: '', bookmark: '' };

        const adAccountsProxyConfig: ProxyConfiguration = {
            // https://developers.pinterest.com/docs/api/v5/#operation/ad_accounts/list
            endpoint: '/v5/ad_accounts',
            params: {
                page_size: 100
            },
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

        await nango.trackDeletesStart('Campaign');

        const adAccounts: Array<{ id: string }> = [];
        for await (const page of nango.paginate(adAccountsProxyConfig)) {
            if (!Array.isArray(page)) {
                throw new Error('Expected ad accounts page to be an array');
            }
            for (const item of page) {
                const parsed = AdAccountIdSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse ad account: ${parsed.error.message}`);
                }
                adAccounts.push(parsed.data);
            }
        }

        // Sort by a stable key so checkpoint resume position is consistent even if the
        // provider returns ad accounts in a different order across runs.
        adAccounts.sort((a, b) => a.id.localeCompare(b.id));

        let startIndex = 0;
        let resumeBookmark: string | undefined;
        if (checkpoint.ad_account_id !== '') {
            const foundIndex = adAccounts.findIndex((account) => account.id === checkpoint.ad_account_id);
            if (foundIndex >= 0) {
                startIndex = foundIndex;
                resumeBookmark = checkpoint.bookmark !== '' ? checkpoint.bookmark : undefined;
            }
        }

        for (let i = startIndex; i < adAccounts.length; i++) {
            const account = adAccounts[i];
            if (!account) {
                break;
            }

            let nextBookmark: string | undefined = resumeBookmark;
            resumeBookmark = undefined;

            const campaignsProxyConfig: ProxyConfiguration = {
                // https://developers.pinterest.com/docs/api/v5/#operation/campaigns/list
                endpoint: `/v5/ad_accounts/${encodeURIComponent(account.id)}/campaigns`,
                params: {
                    ...(nextBookmark && { bookmark: nextBookmark }),
                    page_size: 25
                },
                paginate: {
                    type: 'cursor',
                    cursor_name_in_request: 'bookmark',
                    cursor_path_in_response: 'bookmark',
                    response_path: 'items',
                    limit_name_in_request: 'page_size',
                    limit: 25,
                    on_page: async ({ nextPageParam }) => {
                        nextBookmark = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                    }
                },
                retries: 3
            };

            for await (const page of nango.paginate(campaignsProxyConfig)) {
                if (!Array.isArray(page)) {
                    throw new Error('Expected campaigns page to be an array');
                }

                const campaigns = [];
                for (const item of page) {
                    const parsed = CampaignSchema.safeParse(item);
                    if (!parsed.success) {
                        throw new Error(`Failed to parse campaign: ${parsed.error.message}`);
                    }
                    campaigns.push(parsed.data);
                }

                if (campaigns.length > 0) {
                    await nango.batchSave(campaigns, 'Campaign');
                }

                if (nextBookmark !== undefined) {
                    await nango.saveCheckpoint({
                        ad_account_id: account.id,
                        bookmark: nextBookmark
                    });
                }
            }

            const nextAccount = adAccounts[i + 1];
            if (nextAccount) {
                await nango.saveCheckpoint({
                    ad_account_id: nextAccount.id,
                    bookmark: ''
                });
            }
        }

        await nango.trackDeletesEnd('Campaign');
        await nango.saveCheckpoint({
            ad_account_id: '',
            bookmark: ''
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
