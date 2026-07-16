import { createSync } from 'nango';
import { z } from 'zod';

const SubscriptionSchema = z.object({
    id: z.string(),
    location_id: z.string().optional(),
    plan_variation_id: z.string().optional(),
    customer_id: z.string().optional(),
    start_date: z.string().optional(),
    canceled_date: z.string().optional(),
    charged_through_date: z.string().optional(),
    status: z.string().optional(),
    tax_percentage: z.string().optional(),
    invoice_ids: z.array(z.string()).optional(),
    price_override_money: z
        .object({
            amount: z.number().optional(),
            currency: z.string().optional()
        })
        .optional(),
    version: z.number().optional(),
    created_at: z.string().optional(),
    card_id: z.string().optional(),
    timezone: z.string().optional(),
    source: z
        .object({
            name: z.string().optional()
        })
        .optional(),
    actions: z.array(z.unknown()).optional(),
    monthly_billing_anchor_date: z.number().optional(),
    phases: z.array(z.unknown()).optional(),
    completed_date: z.string().optional()
});

const CheckpointSchema = z.object({
    cursor: z.string()
});

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
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint == null ? { cursor: '' } : CheckpointSchema.parse(rawCheckpoint);
        let cursor = checkpoint.cursor || undefined;

        // https://developer.squareup.com/reference/square/subscriptions-api/search-subscriptions
        for await (const page of nango.paginate({
            endpoint: '/v2/subscriptions/search',
            method: 'POST',
            data: {
                ...(cursor && { cursor }),
                limit: 100
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'cursor',
                response_path: 'subscriptions',
                limit_name_in_request: 'limit',
                limit: 100,
                on_page: async (paginationState) => {
                    cursor = typeof paginationState.nextPageParam === 'string' ? paginationState.nextPageParam : undefined;
                }
            },
            retries: 3
        })) {
            const parseResult = z.array(SubscriptionSchema).safeParse(page);
            if (!parseResult.success) {
                throw new Error(`Failed to parse subscriptions page: ${parseResult.error.message}`);
            }

            const subscriptions = parseResult.data;
            const records = subscriptions.map((sub) => ({
                id: sub.id,
                ...(sub.location_id !== undefined && { location_id: sub.location_id }),
                ...(sub.plan_variation_id !== undefined && { plan_variation_id: sub.plan_variation_id }),
                ...(sub.customer_id !== undefined && { customer_id: sub.customer_id }),
                ...(sub.start_date !== undefined && { start_date: sub.start_date }),
                ...(sub.canceled_date !== undefined && { canceled_date: sub.canceled_date }),
                ...(sub.charged_through_date !== undefined && { charged_through_date: sub.charged_through_date }),
                ...(sub.status !== undefined && { status: sub.status }),
                ...(sub.tax_percentage !== undefined && { tax_percentage: sub.tax_percentage }),
                ...(sub.invoice_ids !== undefined && { invoice_ids: sub.invoice_ids }),
                ...(sub.price_override_money !== undefined && { price_override_money: sub.price_override_money }),
                ...(sub.version !== undefined && { version: sub.version }),
                ...(sub.created_at !== undefined && { created_at: sub.created_at }),
                ...(sub.card_id !== undefined && { card_id: sub.card_id }),
                ...(sub.timezone !== undefined && { timezone: sub.timezone }),
                ...(sub.source !== undefined && { source: sub.source }),
                ...(sub.actions !== undefined && { actions: sub.actions }),
                ...(sub.monthly_billing_anchor_date !== undefined && { monthly_billing_anchor_date: sub.monthly_billing_anchor_date }),
                ...(sub.phases !== undefined && { phases: sub.phases }),
                ...(sub.completed_date !== undefined && { completed_date: sub.completed_date })
            }));

            if (records.length > 0) {
                await nango.batchSave(records, 'Subscription');
            }

            if (cursor) {
                await nango.saveCheckpoint({ cursor });
            }
        }

        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
