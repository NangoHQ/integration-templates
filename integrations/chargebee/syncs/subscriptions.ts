import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const SubscriptionItemSchema = z
    .object({
        item_price_id: z.string(),
        item_type: z.string().optional(),
        quantity: z.number().optional(),
        unit_price: z.number().optional(),
        amount: z.number().optional(),
        billing_cycles: z.number().optional(),
        free_quantity: z.number().optional()
    })
    .passthrough();

const SubscriptionSchema = z.object({
    id: z.string(),
    status: z.string(),
    customer_id: z.string(),
    updated_at: z.number(),
    created_at: z.number().optional(),
    started_at: z.number().optional(),
    activated_at: z.number().optional(),
    cancelled_at: z.number().optional(),
    current_term_start: z.number().optional(),
    current_term_end: z.number().optional(),
    next_billing_at: z.number().optional(),
    cancel_reason: z.string().optional(),
    has_scheduled_changes: z.boolean().optional(),
    resource_version: z.number().optional(),
    subscription_items: z.array(SubscriptionItemSchema).optional()
});

const CheckpointSchema = z.object({
    updated_after: z.number(),
    offset: z.string()
});

const ChargebeeSubscriptionSchema = z
    .object({
        id: z.string(),
        status: z.string(),
        customer_id: z.string(),
        updated_at: z.number(),
        created_at: z.number().optional(),
        started_at: z.number().optional(),
        activated_at: z.number().optional(),
        cancelled_at: z.number().optional(),
        current_term_start: z.number().optional(),
        current_term_end: z.number().optional(),
        next_billing_at: z.number().optional(),
        cancel_reason: z.string().optional(),
        has_scheduled_changes: z.boolean().optional(),
        resource_version: z.number().optional(),
        subscription_items: z.array(SubscriptionItemSchema).optional()
    })
    .passthrough();

const ChargebeeListEntrySchema = z.object({
    subscription: ChargebeeSubscriptionSchema
});

const sync = createSync({
    description: 'Sync subscriptions incrementally using updated_at timestamp filter.',
    version: '1.0.0',
    frequency: 'every hour',
    // https://apidocs.chargebee.com/docs/api/subscriptions
    checkpoint: CheckpointSchema,
    models: {
        Subscription: SubscriptionSchema
    },
    autoStart: true,
    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const rawUpdated = checkpoint?.['updated_after'];
        const updatedAfter: number | undefined = typeof rawUpdated === 'number' && rawUpdated !== 0 ? rawUpdated : undefined;
        let offset: string | undefined = checkpoint?.['offset'] || undefined;

        // https://apidocs.chargebee.com/docs/api/subscriptions
        const params: Record<string, string | number> = {
            sort: 'updated_at[asc]',
            limit: 100
        };
        if (updatedAfter !== undefined) {
            params['updated_at[after]'] = updatedAfter;
        }
        if (offset !== undefined) {
            params['offset'] = offset;
        }

        const proxyConfig: ProxyConfiguration = {
            // https://apidocs.chargebee.com/docs/api/subscriptions
            endpoint: '/api/v2/subscriptions',
            params,
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'offset',
                cursor_path_in_response: 'next_offset',
                response_path: 'list',
                limit_name_in_request: 'limit',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    offset = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        let lastUpdatedAt: number | undefined;

        for await (const page of nango.paginate(proxyConfig)) {
            const subscriptions = page.map((raw) => {
                const parsed = ChargebeeListEntrySchema.parse(raw);
                const sub = parsed.subscription;
                return {
                    id: sub.id,
                    status: sub.status,
                    customer_id: sub.customer_id,
                    updated_at: sub.updated_at,
                    ...(sub.created_at !== undefined && { created_at: sub.created_at }),
                    ...(sub.started_at !== undefined && { started_at: sub.started_at }),
                    ...(sub.activated_at !== undefined && { activated_at: sub.activated_at }),
                    ...(sub.cancelled_at !== undefined && { cancelled_at: sub.cancelled_at }),
                    ...(sub.current_term_start !== undefined && { current_term_start: sub.current_term_start }),
                    ...(sub.current_term_end !== undefined && { current_term_end: sub.current_term_end }),
                    ...(sub.next_billing_at !== undefined && { next_billing_at: sub.next_billing_at }),
                    ...(sub.cancel_reason !== undefined && { cancel_reason: sub.cancel_reason }),
                    ...(sub.has_scheduled_changes !== undefined && { has_scheduled_changes: sub.has_scheduled_changes }),
                    ...(sub.resource_version !== undefined && { resource_version: sub.resource_version }),
                    ...(sub.subscription_items !== undefined && { subscription_items: sub.subscription_items })
                };
            });

            if (subscriptions.length === 0) {
                continue;
            }

            await nango.batchSave(subscriptions, 'Subscription');
            const lastSubscription = subscriptions[subscriptions.length - 1];
            if (lastSubscription !== undefined) {
                lastUpdatedAt = lastSubscription.updated_at;
            }

            if (offset !== undefined) {
                await nango.saveCheckpoint({
                    updated_after: updatedAfter ?? 0,
                    offset
                });
            }
        }

        if (lastUpdatedAt !== undefined) {
            await nango.saveCheckpoint({
                updated_after: lastUpdatedAt,
                offset: ''
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
