import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CustomerListSchema = z.object({
    id: z.string(),
    ad_account_id: z.string().optional(),
    name: z.string().optional(),
    type: z.string().optional(),
    status: z.string().optional(),
    num_batches: z.number().optional(),
    num_removed_user_records: z.number().optional(),
    num_uploaded_user_records: z.number().optional(),
    created_time: z.number().optional(),
    updated_time: z.number().optional(),
    is_nca: z.boolean().optional()
});

const CheckpointSchema = z.object({
    ad_account_id: z.string(),
    bookmark: z.string()
});

const AdAccountSchema = z
    .object({
        id: z.string()
    })
    .passthrough();

const sync = createSync({
    description: 'Sync customer (match audience) lists.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        CustomerList: CustomerListSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointResult = CheckpointSchema.safeParse(rawCheckpoint ?? { ad_account_id: '', bookmark: '' });
        const checkpoint = checkpointResult.success ? checkpointResult.data : { ad_account_id: '', bookmark: '' };

        const adAccountsProxyConfig: ProxyConfiguration = {
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

        const adAccounts: Array<{ id: string }> = [];

        for await (const page of nango.paginate(adAccountsProxyConfig)) {
            const parsedPage = z.array(AdAccountSchema).safeParse(page);
            if (!parsedPage.success) {
                throw new Error(`Failed to parse ad accounts page: ${parsedPage.error.message}`);
            }
            for (const adAccount of parsedPage.data) {
                adAccounts.push(adAccount);
            }
        }

        if (adAccounts.length === 0) {
            await nango.clearCheckpoint();
            return;
        }

        // Customer lists are updated in place rather than hard-deleted, so the bookmark cursor
        // is safe to use as a resumable checkpoint between failed runs.
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

            let nextBookmark = resumeBookmark;
            resumeBookmark = undefined;

            const customerListsProxyConfig: ProxyConfiguration = {
                // https://developers.pinterest.com/docs/api/v5/#operation/customer_lists/list
                endpoint: `/v5/ad_accounts/${encodeURIComponent(adAccount.id)}/customer_lists`,
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

            for await (const page of nango.paginate(customerListsProxyConfig)) {
                const parsedPage = z.array(CustomerListSchema).safeParse(page);
                if (!parsedPage.success) {
                    throw new Error(`Failed to parse customer lists page for ad account ${adAccount.id}: ${parsedPage.error.message}`);
                }

                const lists = parsedPage.data.map((record) => ({
                    id: record.id,
                    ad_account_id: adAccount.id,
                    ...(record.name != null && { name: record.name }),
                    ...(record.type != null && { type: record.type }),
                    ...(record.status != null && { status: record.status }),
                    ...(record.num_batches != null && { num_batches: record.num_batches }),
                    ...(record.num_removed_user_records != null && { num_removed_user_records: record.num_removed_user_records }),
                    ...(record.num_uploaded_user_records != null && { num_uploaded_user_records: record.num_uploaded_user_records }),
                    ...(record.created_time != null && { created_time: record.created_time }),
                    ...(record.updated_time != null && { updated_time: record.updated_time }),
                    ...(record.is_nca != null && { is_nca: record.is_nca })
                }));

                if (lists.length > 0) {
                    await nango.batchSave(lists, 'CustomerList');
                }

                await nango.saveCheckpoint({
                    ad_account_id: adAccount.id,
                    bookmark: nextBookmark ?? ''
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

        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
