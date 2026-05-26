import { createSync } from 'nango';
import { z } from 'zod';

const RawRefundSchema = z.object({
    id: z.string(),
    amount: z.number(),
    balance_transaction: z.string().nullable().optional(),
    charge: z.string().nullable().optional(),
    created: z.number(),
    currency: z.string(),
    payment_intent: z.string().nullable().optional(),
    reason: z.string().nullable().optional(),
    receipt_number: z.string().nullable().optional(),
    status: z.string()
});

const ListResponseSchema = z.object({
    object: z.string(),
    url: z.string(),
    has_more: z.boolean(),
    data: z.array(RawRefundSchema)
});

const RefundSchema = z.object({
    id: z.string(),
    amount: z.number(),
    currency: z.string(),
    status: z.string(),
    created: z.number(),
    charge: z.string().optional(),
    payment_intent: z.string().optional(),
    reason: z.string().optional(),
    receipt_number: z.string().optional(),
    balance_transaction: z.string().optional()
});

const CheckpointSchema = z.object({
    created_after: z.number(),
    starting_after: z.string()
});

const mapRefund = (raw: z.infer<typeof RawRefundSchema>) => ({
    id: raw.id,
    amount: raw.amount,
    currency: raw.currency,
    status: raw.status,
    created: raw.created,
    charge: raw.charge ?? undefined,
    payment_intent: raw.payment_intent ?? undefined,
    reason: raw.reason ?? undefined,
    receipt_number: raw.receipt_number ?? undefined,
    balance_transaction: raw.balance_transaction ?? undefined
});

const sync = createSync({
    description: 'Sync refunds from Stripe.',
    version: '1.0.0',
    endpoints: [{ method: 'GET', path: '/syncs/refunds' }],
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Refund: RefundSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const createdAfter = checkpoint != null ? checkpoint['created_after'] : -1;
        let startingAfter = checkpoint != null ? checkpoint['starting_after'] : '';
        let newestCreated: number | undefined;

        while (true) {
            const params: Record<string, string | number> = {
                limit: 100
            };
            if (createdAfter !== -1) {
                params['created[gte]'] = String(createdAfter);
            }
            if (startingAfter !== '') {
                params['starting_after'] = startingAfter;
            }

            // https://docs.stripe.com/api/refunds/list
            const response = await nango.get({
                endpoint: '/v1/refunds',
                params,
                retries: 3
            });

            const envelope = ListResponseSchema.parse(response.data);
            const rawRefunds = envelope.data;

            if (rawRefunds.length === 0) {
                break;
            }

            if (newestCreated === undefined) {
                const firstRefund = rawRefunds[0];
                if (firstRefund !== undefined) {
                    newestCreated = firstRefund.created;
                }
            }

            const refunds = rawRefunds.map(mapRefund);
            await nango.batchSave(refunds, 'Refund');

            if (!envelope.has_more) {
                break;
            }

            const lastRefund = rawRefunds[rawRefunds.length - 1];
            if (lastRefund === undefined) {
                break;
            }
            startingAfter = lastRefund.id;

            await nango.saveCheckpoint({
                created_after: newestCreated ?? createdAfter,
                starting_after: startingAfter
            });
        }

        if (newestCreated !== undefined || createdAfter !== -1) {
            await nango.saveCheckpoint({
                created_after: newestCreated ?? createdAfter,
                starting_after: ''
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
