import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CreditNoteLineItemSchema = z.object({
    id: z.string(),
    object: z.string().optional(),
    amount: z.number(),
    description: z.string().nullable().optional(),
    discount_amount: z.number().optional(),
    discount_amounts: z.array(z.record(z.string(), z.unknown())).optional(),
    invoice_line_item: z.string().nullable().optional(),
    livemode: z.boolean().optional(),
    quantity: z.number().nullable().optional(),
    tax_rates: z.array(z.record(z.string(), z.unknown())).optional(),
    taxes: z.array(z.record(z.string(), z.unknown())).optional(),
    type: z.string().optional(),
    unit_amount: z.number().nullable().optional(),
    unit_amount_decimal: z.string().nullable().optional()
});

const CreditNoteLinesSchema = z.object({
    object: z.string().optional(),
    data: z.array(CreditNoteLineItemSchema),
    has_more: z.boolean(),
    url: z.string()
});

const CreditNoteSchema = z.object({
    id: z.string(),
    object: z.string().optional(),
    amount: z.number(),
    amount_shipping: z.number().optional(),
    created: z.number(),
    currency: z.string(),
    customer: z.string().optional(),
    customer_balance_transaction: z.string().nullable().optional(),
    discount_amount: z.number().optional(),
    discount_amounts: z.array(z.record(z.string(), z.unknown())).optional(),
    invoice: z.string().optional(),
    lines: CreditNoteLinesSchema.optional(),
    livemode: z.boolean().optional(),
    memo: z.string().nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    number: z.string().optional(),
    out_of_band_amount: z.number().nullable().optional(),
    pdf: z.string().optional(),
    pre_payment_amount: z.number().optional(),
    post_payment_amount: z.number().optional(),
    reason: z.string().nullable().optional(),
    refunds: z.array(z.record(z.string(), z.unknown())).optional(),
    shipping_cost: z.record(z.string(), z.unknown()).nullable().optional(),
    status: z.string().optional(),
    subtotal: z.number().optional(),
    subtotal_excluding_tax: z.number().optional(),
    total: z.number().optional(),
    total_excluding_tax: z.number().optional(),
    total_taxes: z.array(z.record(z.string(), z.unknown())).optional(),
    type: z.string().optional(),
    voided_at: z.number().nullable().optional()
});

const StripeListResponseSchema = z.object({
    object: z.literal('list'),
    url: z.string(),
    has_more: z.boolean(),
    data: z.array(z.unknown())
});

const CheckpointSchema = z.object({
    created_after: z.number(),
    starting_after: z.string()
});

const sync = createSync({
    description: 'Sync credit notes from Stripe.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        CreditNote: CreditNoteSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/credit-notes'
        }
    ],

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = CheckpointSchema.parse({
            created_after: typeof rawCheckpoint?.created_after === 'number' ? rawCheckpoint.created_after : 0,
            starting_after: typeof rawCheckpoint?.starting_after === 'string' ? rawCheckpoint.starting_after : ''
        });
        const startTime = Math.floor(Date.now() / 1000);
        const createdAfter = checkpoint.created_after;
        let startingAfter = checkpoint.starting_after;

        const limit = 100;
        const hasMore = true;

        while (hasMore) {
            const params: Record<string, string | number> = {
                limit
            };

            if (createdAfter > 0) {
                params['created[gte]'] = createdAfter;
            }

            if (startingAfter) {
                params['starting_after'] = startingAfter;
            }

            const config: ProxyConfiguration = {
                // https://docs.stripe.com/api/credit_notes/list
                endpoint: '/v1/credit_notes',
                params,
                retries: 3
            };

            const response = await nango.get(config);
            const parsed = StripeListResponseSchema.parse(response.data);
            const creditNotes = parsed.data.map((item) => CreditNoteSchema.parse(item));

            if (creditNotes.length === 0) {
                break;
            }

            await nango.batchSave(creditNotes, 'CreditNote');

            if (!parsed.has_more) {
                break;
            }

            const lastCreditNote = creditNotes[creditNotes.length - 1];
            if (!lastCreditNote) {
                break;
            }

            startingAfter = lastCreditNote.id;
            await nango.saveCheckpoint({
                created_after: createdAfter,
                starting_after: startingAfter
            });
        }

        await nango.saveCheckpoint({ created_after: startTime, starting_after: '' });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
