import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderOrderSchema = z
    .object({
        id: z.union([z.number(), z.string()]),
        name: z.string().nullish(),
        fulfilled_at: z.string().nullish(),
        external_id: z.union([z.number(), z.string()]).nullish(),
        reviewer_id: z.union([z.number(), z.string()]).nullish(),
        fulfillment_status: z.string().nullish(),
        cancelled_at: z.string().nullish(),
        country: z.string().nullish()
    })
    .passthrough();

const OrderSchema = z
    .object({
        id: z.string().describe('The stable Judge.me internal identifier for the order.'),
        name: z.string().optional().describe('The human-readable order name or identifier displayed in the shop.'),
        fulfilled_at: z.string().optional().describe('ISO 8601 timestamp when the order was fulfilled, if available.'),
        external_id: z.string().optional().describe('The external platform identifier for the order (e.g., Shopify order ID).'),
        reviewer_id: z.string().optional().describe('The Judge.me internal identifier of the reviewer linked to this order, if any.'),
        fulfillment_status: z.string().optional().describe('The current fulfillment status of the order (e.g., fulfilled, unfulfilled).'),
        cancelled_at: z.string().optional().describe('ISO 8601 timestamp when the order was cancelled, if applicable.'),
        country: z.string().optional().describe('The country code associated with the order.')
    })
    .describe('An order known to Judge.me for the connected shop.');

const CheckpointSchema = z.object({
    page: z.number().int().positive()
});

const sync = createSync({
    description: 'Sync orders known to Judge.me for the shop.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Order: OrderSchema
    },

    exec: async (nango) => {
        // Blocker: GET api/v1/orders ignores explicit start_date/end_date params and always
        // returns a rolling ~30-day window (confirmed against the live API: passing a 2020
        // date range still returns the current ~30-day window). There is no confirmed
        // changed-since filter or deleted-record endpoint, so orders outside that window
        // cannot be re-enumerated and deletion tracking cannot be used here without
        // incorrectly deleting older orders on every run.
        const checkpoint = await nango.getCheckpoint();
        let page: number | undefined = checkpoint?.page ?? 1;

        const proxyConfig: ProxyConfiguration = {
            // https://judge.me/api/docs
            endpoint: 'api/v1/orders',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: page,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100,
                response_path: 'orders',
                on_page: async ({ nextPageParam }: { nextPageParam?: string | number | undefined }) => {
                    page = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const pageResults of nango.paginate(proxyConfig)) {
            const orders = pageResults
                .map((raw) => {
                    const parsed = ProviderOrderSchema.safeParse(raw);
                    if (!parsed.success) {
                        throw new Error(`Failed to parse order: ${parsed.error.message}`);
                    }
                    return parsed.data;
                })
                .map((record) => ({
                    id: String(record.id),
                    ...(record.name != null && { name: record.name }),
                    ...(record.fulfilled_at != null && { fulfilled_at: record.fulfilled_at }),
                    ...(record.external_id != null && { external_id: String(record.external_id) }),
                    ...(record.reviewer_id != null && { reviewer_id: String(record.reviewer_id) }),
                    ...(record.fulfillment_status != null && { fulfillment_status: record.fulfillment_status }),
                    ...(record.cancelled_at != null && { cancelled_at: record.cancelled_at }),
                    ...(record.country != null && { country: record.country })
                }));

            if (orders.length > 0) {
                await nango.batchSave(orders, 'Order');
            }

            if (page !== undefined) {
                await nango.saveCheckpoint({ page });
            }
        }

        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
