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

const sync = createSync({
    description: 'Sync insertion-order line items.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        OrderLine: OrderLineSchema
    },

    exec: async (nango) => {
        // Blocker: GET /v5/ad_accounts/{ad_account_id}/order_lines exposes no
        // updated_after, modified_since, or similar incremental filter, and the
        // OrderLine schema has no updated_time field. Full refresh is required.
        await nango.trackDeletesStart('OrderLine');

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

        for await (const accounts of nango.paginate(adAccountProxyConfig)) {
            for (const rawAccount of accounts) {
                const account = z.object({ id: z.string() }).parse(rawAccount);

                const orderLinesProxyConfig: ProxyConfiguration = {
                    // https://developers.pinterest.com/docs/api/v5/#tag/order_lines/operation/order_lines/list
                    endpoint: `/v5/ad_accounts/${encodeURIComponent(account.id)}/order_lines`,
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

                for await (const rawOrderLines of nango.paginate(orderLinesProxyConfig)) {
                    const orderLines = rawOrderLines.map((raw) => OrderLineSchema.parse(raw));

                    if (orderLines.length > 0) {
                        await nango.batchSave(orderLines, 'OrderLine');
                    }
                }
            }
        }

        await nango.trackDeletesEnd('OrderLine');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
