import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const OrderLineSchema = z.object({
    id: z.string().describe('Order line ID'),
    ad_account_id: z.string().describe('Ad account ID'),
    budget: z.number().nullable().optional(),
    campaign_ids: z.array(z.string()),
    end_time: z.number().nullable().optional(),
    name: z.string().nullable().optional(),
    paid_budget: z.number().nullable().optional(),
    paid_type: z.enum(['PAID', 'BONUS', 'MAKE_GOOD', 'TEST']).nullable().optional(),
    purchase_order_id: z.string().nullable().optional(),
    start_time: z.number(),
    status: z.enum(['ACTIVE', 'PAUSED', 'DELETED']),
    type: z.string()
});

const AdAccountSchema = z.object({
    id: z.string().describe('Ad account ID')
});

const CheckpointSchema = z.object({
    ad_account_id: z.string(),
    bookmark: z.string()
});

const sync = createSync({
    description: 'Sync insertion-order line items.',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        OrderLine: OrderLineSchema
    },

    exec: async (nango) => {
        // Blocker: GET /v5/ad_accounts/{ad_account_id}/order_lines exposes no
        // updated_after, modified_since, or similar incremental filter, and the
        // OrderLine schema has no updated_time field. Full refresh is required.
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

        await nango.trackDeletesStart('OrderLine');

        const adAccounts: Array<z.infer<typeof AdAccountSchema>> = [];
        for await (const page of nango.paginate(adAccountProxyConfig)) {
            for (const raw of page) {
                const parsed = AdAccountSchema.safeParse(raw);
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

            let nextBookmark = resumeBookmark;
            resumeBookmark = undefined;

            const orderLinesProxyConfig: ProxyConfiguration = {
                // https://developers.pinterest.com/docs/api/v5/#tag/order_lines/operation/order_lines/list
                endpoint: `/v5/ad_accounts/${encodeURIComponent(account.id)}/order_lines`,
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

            for await (const page of nango.paginate(orderLinesProxyConfig)) {
                const orderLines = [];
                for (const raw of page) {
                    const parsed = OrderLineSchema.safeParse(raw);
                    if (!parsed.success) {
                        throw new Error(`Failed to parse order line: ${parsed.error.message}`);
                    }
                    orderLines.push(parsed.data);
                }

                if (orderLines.length > 0) {
                    await nango.batchSave(orderLines, 'OrderLine');
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

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('OrderLine');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
