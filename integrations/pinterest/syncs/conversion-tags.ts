import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ConversionTagSchema = z.object({
    id: z.string(),
    ad_account_id: z.string(),
    status: z.string().optional(),
    code_snippet: z.string().optional(),
    configs: z
        .object({
            aem_db_enabled: z.boolean().nullable().optional(),
            aem_enabled: z.boolean().nullable().optional(),
            aem_external_id_enabled: z.boolean().nullable().optional(),
            aem_fnln_enabled: z.boolean().nullable().optional(),
            aem_ge_enabled: z.boolean().nullable().optional(),
            aem_loc_enabled: z.boolean().nullable().optional(),
            aem_ph_enabled: z.boolean().nullable().optional(),
            md_frequency: z.number().nullable().optional(),
            no_code_capi_domains: z.array(z.string()).optional()
        })
        .optional(),
    enhanced_match_status: z.string().nullable().optional(),
    last_fired_time_ms: z.number().nullable().optional(),
    name: z.string(),
    version: z.string().optional()
});

const CheckpointSchema = z.object({
    ad_account_id: z.string(),
    bookmark: z.string()
});

const sync = createSync({
    description: 'Sync conversion (tracking) tags.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        ConversionTag: ConversionTagSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointResult = CheckpointSchema.safeParse(rawCheckpoint ?? { ad_account_id: '', bookmark: '' });
        const checkpoint = checkpointResult.success ? checkpointResult.data : { ad_account_id: '', bookmark: '' };

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

        await nango.trackDeletesStart('ConversionTag');

        const adAccounts: Array<{ id: string }> = [];
        for await (const page of nango.paginate(adAccountProxyConfig)) {
            for (const account of page) {
                const parsed = z.object({ id: z.string() }).safeParse(account);
                if (!parsed.success) {
                    throw new Error(`Failed to parse ad account: ${parsed.error.message}`);
                }
                adAccounts.push(parsed.data);
            }
        }

        // Sort by a stable key so checkpoint resume position is consistent even if the
        // provider returns ad accounts in a different order across runs.
        adAccounts.sort((a, b) => a.id.localeCompare(b.id));

        // Conversion tags cannot be deleted through the API, so a saved bookmark is safe to use
        // as a resumable checkpoint between failed runs.
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

            const tagProxyConfig: ProxyConfiguration = {
                // https://developers.pinterest.com/docs/api/v5/#operation/conversion_tags/list
                endpoint: `/v5/ad_accounts/${encodeURIComponent(account.id)}/conversion_tags`,
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

            for await (const page of nango.paginate(tagProxyConfig)) {
                const tags = page.map((tag) => {
                    const parsed = ConversionTagSchema.safeParse(tag);
                    if (!parsed.success) {
                        throw new Error(`Failed to parse conversion tag: ${parsed.error.message}`);
                    }
                    return parsed.data;
                });

                if (tags.length > 0) {
                    await nango.batchSave(tags, 'ConversionTag');
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

        await nango.trackDeletesEnd('ConversionTag');
        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
