import { createSync } from 'nango';
import { z } from 'zod';

const StripeInvoiceItemSchema = z.object({
    id: z.string(),
    amount: z.number(),
    currency: z.string(),
    customer: z.string().nullable().optional(),
    date: z.number(),
    description: z.string().nullable().optional(),
    discountable: z.boolean().optional(),
    discounts: z.array(z.string()).nullable().optional(),
    invoice: z.string().nullable().optional(),
    livemode: z.boolean().optional(),
    metadata: z.record(z.string(), z.unknown()).nullable().optional(),
    period: z
        .object({
            end: z.number(),
            start: z.number()
        })
        .nullable()
        .optional(),
    proration: z.boolean().optional(),
    quantity: z.number().optional(),
    quantity_decimal: z.string().optional(),
    tax_rates: z.array(z.unknown()).nullable().optional(),
    test_clock: z.string().nullable().optional()
});

const ListResponseSchema = z.object({
    object: z.literal('list'),
    url: z.string(),
    has_more: z.boolean(),
    data: z.array(StripeInvoiceItemSchema)
});

const CheckpointSchema = z.object({
    starting_after: z.string()
});

const InvoiceItemSchema = z.object({
    id: z.string(),
    amount: z.number(),
    currency: z.string(),
    customer: z.string().optional(),
    date: z.number(),
    description: z.string().optional(),
    discountable: z.boolean().optional(),
    discounts: z.array(z.string()).optional(),
    invoice: z.string().optional(),
    livemode: z.boolean().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    period_end: z.number().optional(),
    period_start: z.number().optional(),
    proration: z.boolean().optional(),
    quantity: z.number().optional(),
    quantity_decimal: z.string().optional(),
    tax_rates: z.array(z.unknown()).optional(),
    test_clock: z.string().optional()
});

const sync = createSync({
    description: 'Sync invoice items from Stripe.',
    version: '1.0.0',
    endpoints: [{ method: 'GET', path: '/syncs/invoice-items' }],
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        InvoiceItem: InvoiceItemSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.safeParse(rawCheckpoint) : null;
        if (checkpoint && !checkpoint.success) {
            throw new Error('Invalid checkpoint: ' + checkpoint.error.message);
        }

        let startingAfter = checkpoint?.data.starting_after ?? '';

        let hasMore = true;
        while (hasMore) {
            // https://docs.stripe.com/api/invoiceitems/list
            const response = await nango.get({
                endpoint: '/v1/invoiceitems',
                params: {
                    limit: 100,
                    ...(startingAfter !== '' && { starting_after: startingAfter })
                },
                retries: 3
            });

            const parsed = ListResponseSchema.parse(response.data);
            const items = parsed.data;

            if (items.length === 0) {
                hasMore = false;
                continue;
            }

            const lastItem = items[items.length - 1];
            if (!lastItem) {
                hasMore = false;
                continue;
            }

            const mappedItems = items.map((item) => ({
                id: item.id,
                amount: item.amount,
                currency: item.currency,
                ...(item.customer != null && { customer: item.customer }),
                date: item.date,
                ...(item.description != null && { description: item.description }),
                ...(item.discountable != null && { discountable: item.discountable }),
                ...(item.discounts != null && { discounts: item.discounts }),
                ...(item.invoice != null && { invoice: item.invoice }),
                ...(item.livemode != null && { livemode: item.livemode }),
                ...(item.metadata != null && { metadata: item.metadata }),
                ...(item.period != null && { period_end: item.period.end, period_start: item.period.start }),
                ...(item.proration != null && { proration: item.proration }),
                ...(item.quantity != null && { quantity: item.quantity }),
                ...(item.quantity_decimal != null && { quantity_decimal: item.quantity_decimal }),
                ...(item.tax_rates != null && { tax_rates: item.tax_rates }),
                ...(item.test_clock != null && { test_clock: item.test_clock })
            }));

            await nango.batchSave(mappedItems, 'InvoiceItem');

            if (!parsed.has_more) {
                hasMore = false;
                continue;
            }

            startingAfter = lastItem.id;
            await nango.saveCheckpoint({ starting_after: startingAfter });
        }

        await nango.saveCheckpoint({ starting_after: '' });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
