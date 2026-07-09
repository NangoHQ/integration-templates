import { createSync } from 'nango';
import type { ProxyConfiguration } from '@nangohq/runner-sdk';
import { z } from 'zod';

const ProviderAdAccountSchema = z.object({
    id: z.string()
});

const ProviderAdGroupSchema = z.object({
    id: z.string(),
    ad_account_id: z.string(),
    campaign_id: z.string(),
    name: z.string(),
    status: z.string().nullish(),
    summary_status: z.string(),
    created_time: z.number(),
    updated_time: z.number(),
    bid_in_micro_currency: z.number().nullish(),
    budget_in_micro_currency: z.number().nullish(),
    budget_type: z.string().nullish(),
    pacing_delivery_type: z.string().nullish(),
    bid_strategy_type: z.string().nullish(),
    billable_event: z.string(),
    start_time: z.number().nullish(),
    end_time: z.number().nullish(),
    targeting_spec: z.record(z.string(), z.unknown()).nullish(),
    tracking_urls: z.record(z.string(), z.unknown()).nullish(),
    auto_targeting_enabled: z.boolean().nullish(),
    placement_group: z.string().nullish(),
    type: z.string().nullish()
});

const AdGroupSchema = z.object({
    id: z.string(),
    ad_account_id: z.string(),
    campaign_id: z.string(),
    name: z.string(),
    status: z.string().optional(),
    summary_status: z.string(),
    created_time: z.number(),
    updated_time: z.number(),
    bid_in_micro_currency: z.number().optional(),
    budget_in_micro_currency: z.number().optional(),
    budget_type: z.string().optional(),
    pacing_delivery_type: z.string().optional(),
    bid_strategy_type: z.string().optional(),
    billable_event: z.string(),
    start_time: z.number().optional(),
    end_time: z.number().optional(),
    targeting_spec: z.record(z.string(), z.unknown()).optional(),
    tracking_urls: z.record(z.string(), z.unknown()).optional(),
    auto_targeting_enabled: z.boolean().optional(),
    placement_group: z.string().optional(),
    type: z.string().optional()
});

const CheckpointSchema = z.object({
    ad_account_id: z.string(),
    bookmark: z.string()
});

const sync = createSync({
    description: 'Sync ad groups.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        AdGroup: AdGroupSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointResult = CheckpointSchema.safeParse(rawCheckpoint ?? { ad_account_id: '', bookmark: '' });
        const checkpoint = checkpointResult.success ? checkpointResult.data : { ad_account_id: '', bookmark: '' };

        const adAccountConfig: ProxyConfiguration = {
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

        await nango.trackDeletesStart('AdGroup');

        const adAccounts: Array<z.infer<typeof ProviderAdAccountSchema>> = [];
        for await (const page of nango.paginate<unknown>(adAccountConfig)) {
            for (const raw of page) {
                const parsed = ProviderAdAccountSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse ad account: ${parsed.error.message}`);
                }
                adAccounts.push(parsed.data);
            }
        }

        // Sort by a stable key so checkpoint resume position is consistent even if the
        // provider returns ad accounts in a different order across runs.
        adAccounts.sort((a, b) => a.id.localeCompare(b.id));

        // Ad groups are archived via status rather than hard-deleted, so the bookmark cursor
        // is safe to use as a resumable page checkpoint between failed runs.
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

            let nextBookmark = resumeBookmark;
            resumeBookmark = undefined;

            const adGroupConfig: ProxyConfiguration = {
                // https://developers.pinterest.com/docs/api/v5/#operation/ad_groups/list
                endpoint: `/v5/ad_accounts/${encodeURIComponent(account.id)}/ad_groups`,
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

            for await (const page of nango.paginate<unknown>(adGroupConfig)) {
                const adGroups: Array<z.infer<typeof AdGroupSchema>> = [];
                for (const raw of page) {
                    const parsed = ProviderAdGroupSchema.safeParse(raw);
                    if (!parsed.success) {
                        throw new Error(`Failed to parse ad group: ${parsed.error.message}`);
                    }
                    const group = parsed.data;
                    adGroups.push({
                        id: group.id,
                        ad_account_id: group.ad_account_id,
                        campaign_id: group.campaign_id,
                        name: group.name,
                        ...(group.status != null && { status: group.status }),
                        summary_status: group.summary_status,
                        created_time: group.created_time,
                        updated_time: group.updated_time,
                        ...(group.bid_in_micro_currency != null && { bid_in_micro_currency: group.bid_in_micro_currency }),
                        ...(group.budget_in_micro_currency != null && { budget_in_micro_currency: group.budget_in_micro_currency }),
                        ...(group.budget_type != null && { budget_type: group.budget_type }),
                        ...(group.pacing_delivery_type != null && { pacing_delivery_type: group.pacing_delivery_type }),
                        ...(group.bid_strategy_type != null && { bid_strategy_type: group.bid_strategy_type }),
                        billable_event: group.billable_event,
                        ...(group.start_time != null && { start_time: group.start_time }),
                        ...(group.end_time != null && { end_time: group.end_time }),
                        ...(group.targeting_spec != null && { targeting_spec: group.targeting_spec }),
                        ...(group.tracking_urls != null && { tracking_urls: group.tracking_urls }),
                        ...(group.auto_targeting_enabled != null && { auto_targeting_enabled: group.auto_targeting_enabled }),
                        ...(group.placement_group != null && { placement_group: group.placement_group }),
                        ...(group.type != null && { type: group.type })
                    });
                }

                if (adGroups.length > 0) {
                    await nango.batchSave(adGroups, 'AdGroup');
                }

                await nango.saveCheckpoint({
                    ad_account_id: account.id,
                    bookmark: nextBookmark ?? ''
                });
            }

            const nextAccount = adAccounts[i + 1];
            if (nextAccount) {
                await nango.saveCheckpoint({
                    ad_account_id: nextAccount.id,
                    bookmark: ''
                });
            }
        }

        await nango.trackDeletesEnd('AdGroup');
        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
