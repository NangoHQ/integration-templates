import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderKeywordSchema = z.object({
    id: z.string(),
    archived: z.boolean().optional(),
    bid: z.number().nullable().optional(),
    match_type: z.string().optional(),
    parent_id: z.string().optional(),
    parent_type: z.string().optional(),
    type: z.string().optional(),
    value: z.string().optional()
});

const KeywordSchema = z.object({
    id: z.string(),
    archived: z.boolean().optional(),
    bid: z.number().optional(),
    match_type: z.string().optional(),
    parent_id: z.string().optional(),
    parent_type: z.string().optional(),
    type: z.string().optional(),
    value: z.string().optional()
});

const CheckpointSchema = z.object({
    ad_account_id: z.string(),
    ad_group_id: z.string(),
    bookmark: z.string()
});

const sync = createSync({
    description: 'Sync targeting keywords.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Keyword: KeywordSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointResult = CheckpointSchema.safeParse(rawCheckpoint ?? { ad_account_id: '', ad_group_id: '', bookmark: '' });
        const checkpoint = checkpointResult.success ? checkpointResult.data : { ad_account_id: '', ad_group_id: '', bookmark: '' };

        const adAccountProxyConfig: ProxyConfiguration = {
            // https://developers.pinterest.com/docs/api/v5/#operation/ad_accounts/list
            endpoint: '/v5/ad_accounts',
            params: {
                page_size: '250'
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'bookmark',
                cursor_path_in_response: 'bookmark',
                response_path: 'items',
                limit_name_in_request: 'page_size',
                limit: 250
            },
            retries: 3
        };

        const adAccounts: Array<{ id: string }> = [];
        for await (const page of nango.paginate(adAccountProxyConfig)) {
            const validated = z
                .array(
                    z.object({
                        id: z.string()
                    })
                )
                .safeParse(page);
            if (!validated.success) {
                throw new Error('Failed to parse ad accounts page');
            }
            adAccounts.push(...validated.data);
        }

        if (adAccounts.length === 0) {
            await nango.clearCheckpoint();
            return;
        }

        // Keywords are archived in place rather than hard-deleted, so bookmark checkpoints are
        // safe to restore after a failed run.
        let startAccountIndex = 0;
        let resumeAdGroupId: string | undefined;
        let resumeBookmark: string | undefined;
        if (checkpoint.ad_account_id !== '') {
            const foundAccountIndex = adAccounts.findIndex((adAccount) => adAccount.id === checkpoint.ad_account_id);
            if (foundAccountIndex >= 0) {
                startAccountIndex = foundAccountIndex;
                resumeAdGroupId = checkpoint.ad_group_id !== '' ? checkpoint.ad_group_id : undefined;
                resumeBookmark = checkpoint.bookmark !== '' ? checkpoint.bookmark : undefined;
            }
        }

        for (let i = startAccountIndex; i < adAccounts.length; i++) {
            const adAccount = adAccounts[i];
            if (!adAccount) {
                break;
            }

            const adAccountId = adAccount.id;

            const adGroupProxyConfig: ProxyConfiguration = {
                // https://developers.pinterest.com/docs/api/v5/#operation/ad_groups/list
                endpoint: `/v5/ad_accounts/${encodeURIComponent(adAccountId)}/ad_groups`,
                params: {
                    page_size: '250'
                },
                paginate: {
                    type: 'cursor',
                    cursor_name_in_request: 'bookmark',
                    cursor_path_in_response: 'bookmark',
                    response_path: 'items',
                    limit_name_in_request: 'page_size',
                    limit: 250
                },
                retries: 3
            };

            const adGroups: Array<{ id: string }> = [];
            for await (const page of nango.paginate(adGroupProxyConfig)) {
                const validated = z
                    .array(
                        z.object({
                            id: z.string()
                        })
                    )
                    .safeParse(page);
                if (!validated.success) {
                    throw new Error(`Failed to parse ad groups page for ad account ${adAccountId}`);
                }
                adGroups.push(...validated.data);
            }

            let startAdGroupIndex = 0;
            let keywordBookmark: string | undefined;
            if (resumeAdGroupId) {
                const foundAdGroupIndex = adGroups.findIndex((adGroup) => adGroup.id === resumeAdGroupId);
                if (foundAdGroupIndex >= 0) {
                    startAdGroupIndex = foundAdGroupIndex;
                    keywordBookmark = resumeBookmark;
                }
                resumeAdGroupId = undefined;
                resumeBookmark = undefined;
            }

            for (let j = startAdGroupIndex; j < adGroups.length; j++) {
                const adGroup = adGroups[j];
                if (!adGroup) {
                    break;
                }

                const adGroupId = adGroup.id;
                let currentBookmark = keywordBookmark;
                keywordBookmark = undefined;

                const keywordProxyConfig: ProxyConfiguration = {
                    // https://developers.pinterest.com/docs/api/v5/#operation/keywords/get
                    endpoint: `/v5/ad_accounts/${encodeURIComponent(adAccountId)}/keywords`,
                    params: {
                        ad_group_id: adGroupId,
                        ...(currentBookmark && { bookmark: currentBookmark }),
                        page_size: '50'
                    },
                    paginate: {
                        type: 'cursor',
                        cursor_name_in_request: 'bookmark',
                        cursor_path_in_response: 'bookmark',
                        response_path: 'items',
                        limit_name_in_request: 'page_size',
                        limit: 50,
                        on_page: async ({ nextPageParam }) => {
                            currentBookmark = nextPageParam != null && typeof nextPageParam === 'string' ? nextPageParam : undefined;
                        }
                    },
                    retries: 3
                };

                for await (const page of nango.paginate(keywordProxyConfig)) {
                    const validated = z.array(ProviderKeywordSchema).safeParse(page);
                    if (!validated.success) {
                        throw new Error(`Failed to parse keywords page for ad group ${adGroupId}`);
                    }

                    const keywords = validated.data.map((item) => ({
                        id: item.id,
                        ...(item.archived !== undefined && { archived: item.archived }),
                        ...(item.bid != null && { bid: item.bid }),
                        ...(item.match_type && { match_type: item.match_type }),
                        ...(item.parent_id && { parent_id: item.parent_id }),
                        ...(item.parent_type && { parent_type: item.parent_type }),
                        ...(item.type && { type: item.type }),
                        ...(item.value && { value: item.value })
                    }));

                    if (keywords.length > 0) {
                        await nango.batchSave(keywords, 'Keyword');
                    }

                    await nango.saveCheckpoint({
                        ad_account_id: adAccountId,
                        ad_group_id: adGroupId,
                        bookmark: currentBookmark ?? ''
                    });
                }

                const nextAdGroup = adGroups[j + 1];
                if (nextAdGroup) {
                    await nango.saveCheckpoint({
                        ad_account_id: adAccountId,
                        ad_group_id: nextAdGroup.id,
                        bookmark: ''
                    });
                }
            }

            const nextAdAccount = adAccounts[i + 1];
            if (nextAdAccount) {
                await nango.saveCheckpoint({
                    ad_account_id: nextAdAccount.id,
                    ad_group_id: '',
                    bookmark: ''
                });
            }
        }

        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
