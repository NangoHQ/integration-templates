import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const SubscriptionSchema = z.object({
    id: z.string(),
    status: z.string(),
    status_update_time: z.string().optional(),
    plan_id: z.string().optional(),
    start_time: z.string().optional(),
    quantity: z.string().optional(),
    shipping_amount: z
        .object({
            currency_code: z.string().optional(),
            value: z.string().optional()
        })
        .optional(),
    subscriber: z
        .object({
            email_address: z.string().optional(),
            name: z
                .object({
                    given_name: z.string().optional(),
                    surname: z.string().optional()
                })
                .optional(),
            payer_id: z.string().optional()
        })
        .optional(),
    billing_info: z
        .object({
            outstanding_balance: z
                .object({
                    currency_code: z.string().optional(),
                    value: z.string().optional()
                })
                .optional(),
            next_billing_time: z.string().optional(),
            failed_payments_count: z.number().optional()
        })
        .optional(),
    create_time: z.string().optional(),
    update_time: z.string().optional(),
    plan_overridden: z.boolean().optional()
});

const CheckpointSchema = z.object({
    status_updated_after: z.string(),
    page: z.number().int().positive()
});

const ProviderSubscriptionSchema = z.object({
    id: z.string(),
    status: z.string(),
    status_update_time: z.string().optional(),
    plan_id: z.string().optional(),
    start_time: z.string().optional(),
    quantity: z.string().optional(),
    shipping_amount: z
        .object({
            currency_code: z.string().optional(),
            value: z.string().optional()
        })
        .optional(),
    subscriber: z
        .object({
            email_address: z.string().optional(),
            name: z
                .object({
                    given_name: z.string().optional(),
                    surname: z.string().optional()
                })
                .optional(),
            payer_id: z.string().optional()
        })
        .optional(),
    billing_info: z
        .object({
            outstanding_balance: z
                .object({
                    currency_code: z.string().optional(),
                    value: z.string().optional()
                })
                .optional(),
            next_billing_time: z.string().optional(),
            failed_payments_count: z.number().optional()
        })
        .optional(),
    create_time: z.string().optional(),
    update_time: z.string().optional(),
    plan_overridden: z.boolean().optional()
});

const DEFAULT_STATUS_UPDATED_AFTER = '1970-01-01T00:00:00Z';

const sync = createSync({
    description: 'Sync subscriptions.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Subscription: SubscriptionSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        // The filter timestamp is held fixed for the entire run (including across a resumed, interrupted
        // pagination): changing it mid-run would shift which records land on which page and could permanently
        // skip subscriptions. It's only advanced to the new high-water mark once the full listing completes.
        const statusUpdatedAfter = checkpoint?.status_updated_after ?? DEFAULT_STATUS_UPDATED_AFTER;
        let page: number | undefined = checkpoint?.page ?? 1;
        let maxStatusUpdateTime: string | undefined;

        const proxyConfig: ProxyConfiguration = {
            // https://developer.paypal.com/api/subscriptions/v1/#subscriptions_list
            endpoint: '/v1/billing/subscriptions',
            params: {
                status_updated_after: statusUpdatedAfter
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: page,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'page_size',
                limit: 20,
                response_path: 'subscriptions',
                on_page: async ({ nextPageParam }) => {
                    page = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const pageResults of nango.paginate(proxyConfig)) {
            const parsed = z.array(ProviderSubscriptionSchema).safeParse(pageResults);
            if (!parsed.success) {
                throw new Error(`Failed to parse subscriptions page: ${parsed.error.message}`);
            }

            const subscriptions = parsed.data.map((record) => ({
                id: record.id,
                status: record.status,
                ...(record.status_update_time != null && { status_update_time: record.status_update_time }),
                ...(record.plan_id != null && { plan_id: record.plan_id }),
                ...(record.start_time != null && { start_time: record.start_time }),
                ...(record.quantity != null && { quantity: record.quantity }),
                ...(record.shipping_amount != null && { shipping_amount: record.shipping_amount }),
                ...(record.subscriber != null && { subscriber: record.subscriber }),
                ...(record.billing_info != null && { billing_info: record.billing_info }),
                ...(record.create_time != null && { create_time: record.create_time }),
                ...(record.update_time != null && { update_time: record.update_time }),
                ...(record.plan_overridden != null && { plan_overridden: record.plan_overridden })
            }));

            for (const record of parsed.data) {
                if (record.status_update_time != null) {
                    if (maxStatusUpdateTime === undefined || record.status_update_time > maxStatusUpdateTime) {
                        maxStatusUpdateTime = record.status_update_time;
                    }
                }
            }

            if (subscriptions.length > 0) {
                await nango.batchSave(subscriptions, 'Subscription');
            }

            // Mid-run checkpoint: keep the filter timestamp stable and only persist the cursor, so an
            // interrupted run resumes pagination against the exact same result set instead of a shifted one.
            if (page !== undefined) {
                await nango.saveCheckpoint({
                    status_updated_after: statusUpdatedAfter,
                    page
                });
            }
        }

        // Full listing completed: now it's safe to advance the watermark and reset the cursor for next run.
        await nango.saveCheckpoint({
            status_updated_after: maxStatusUpdateTime ?? statusUpdatedAfter,
            page: 1
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
