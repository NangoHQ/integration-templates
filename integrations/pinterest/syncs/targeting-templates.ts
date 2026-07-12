import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const TargetingTemplateSchema = z.object({
    id: z.string(),
    name: z.string(),
    ad_account_id: z.string().optional(),
    auto_targeting_enabled: z.boolean().optional(),
    created_time: z.number().optional(),
    updated_time: z.number().optional(),
    valid: z.boolean().nullable().optional(),
    placement_group: z.string().optional(),
    status: z.string().optional(),
    keywords: z.array(z.object({}).passthrough()).optional(),
    targeting_attributes: z.record(z.string(), z.unknown()).nullish(),
    tracking_urls: z.record(z.string(), z.unknown()).nullish(),
    sizing: z.record(z.string(), z.unknown()).nullish()
});

const AdAccountSchema = z
    .object({
        id: z.string()
    })
    .passthrough();

const CheckpointSchema = z.object({
    ad_account_id: z.string(),
    bookmark: z.string()
});

const sync = createSync({
    description: 'Sync reusable targeting templates',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        TargetingTemplate: TargetingTemplateSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointResult = CheckpointSchema.safeParse(rawCheckpoint ?? { ad_account_id: '', bookmark: '' });
        const checkpoint = checkpointResult.success ? checkpointResult.data : { ad_account_id: '', bookmark: '' };

        const adAccountProxyConfig: ProxyConfiguration = {
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

        await nango.trackDeletesStart('TargetingTemplate');

        const adAccounts: Array<z.infer<typeof AdAccountSchema>> = [];
        for await (const page of nango.paginate(adAccountProxyConfig)) {
            for (const raw of page) {
                const parsed = AdAccountSchema.parse(raw);
                adAccounts.push(parsed);
            }
        }

        // Sort by a stable key so checkpoint resume position is consistent even if the
        // provider returns ad accounts in a different order across runs.
        adAccounts.sort((a, b) => a.id.localeCompare(b.id));

        // Targeting templates are archived via status rather than hard-deleted, so the
        // bookmark cursor is safe to use as a resumable checkpoint between failed runs.
        let startIndex = 0;
        let resumeBookmark: string | undefined;
        if (checkpoint.ad_account_id !== '') {
            const foundIndex = adAccounts.findIndex((adAccount) => adAccount.id === checkpoint.ad_account_id);
            if (foundIndex >= 0) {
                startIndex = foundIndex;
                resumeBookmark = checkpoint.bookmark !== '' ? checkpoint.bookmark : undefined;
            }
        }

        for (let i = startIndex; i < adAccounts.length; i++) {
            const adAccount = adAccounts[i];
            if (!adAccount) {
                break;
            }

            let bookmark = resumeBookmark;
            resumeBookmark = undefined;

            const templateProxyConfig: ProxyConfiguration = {
                // https://developers.pinterest.com/docs/api/v5/#tag/targeting_template/operation/targeting_template/list
                endpoint: `/v5/ad_accounts/${encodeURIComponent(adAccount.id)}/targeting_templates`,
                params: {
                    ...(bookmark && { bookmark })
                },
                paginate: {
                    type: 'cursor',
                    cursor_name_in_request: 'bookmark',
                    cursor_path_in_response: 'bookmark',
                    response_path: 'items',
                    limit_name_in_request: 'page_size',
                    limit: 100,
                    on_page: async ({ nextPageParam }) => {
                        bookmark = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                    }
                },
                retries: 3
            };

            for await (const page of nango.paginate(templateProxyConfig)) {
                const records: Array<z.infer<typeof TargetingTemplateSchema>> = [];
                for (const raw of page) {
                    const parsed = TargetingTemplateSchema.parse(raw);
                    records.push(parsed);
                }

                if (records.length > 0) {
                    await nango.batchSave(records, 'TargetingTemplate');
                }

                await nango.saveCheckpoint({
                    ad_account_id: adAccount.id,
                    bookmark: bookmark ?? ''
                });
            }

            const nextAdAccount = adAccounts[i + 1];
            if (nextAdAccount) {
                await nango.saveCheckpoint({
                    ad_account_id: nextAdAccount.id,
                    bookmark: ''
                });
            }
        }

        await nango.trackDeletesEnd('TargetingTemplate');
        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
