import { createSync } from 'nango';
import { z } from 'zod';

const CustomerInvoiceSchema = z.object({
    id: z.string(),
    label: z.string().optional(),
    invoice_number: z.string(),
    currency: z.string(),
    amount: z.string(),
    currency_amount: z.string(),
    currency_amount_before_tax: z.string(),
    exchange_rate: z.string(),
    date: z.string().optional(),
    deadline: z.string().optional(),
    currency_tax: z.string(),
    tax: z.string(),
    language: z.string(),
    paid: z.boolean(),
    status: z.string(),
    draft: z.boolean(),
    special_mention: z.string().optional(),
    customer_id: z.string().optional(),
    ledger_entry_id: z.string().optional(),
    quote_id: z.string().optional(),
    billing_subscription_id: z.string().optional(),
    credited_invoice_id: z.string().optional(),
    customer_invoice_template_id: z.string().optional(),
    public_file_url: z.string().optional(),
    filename: z.string().optional(),
    remaining_amount_with_tax: z.string().optional(),
    remaining_amount_without_tax: z.string().optional(),
    external_reference: z.string(),
    factur_x: z.boolean(),
    archived_at: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string()
});

const ChangelogItemSchema = z.object({
    id: z.number().int(),
    operation: z.enum(['insert', 'update', 'delete']),
    processed_at: z.string(),
    updated_at: z.string(),
    created_at: z.string()
});

const ChangelogResponseSchema = z.object({
    items: z.array(ChangelogItemSchema),
    has_more: z.boolean(),
    next_cursor: z.string().nullable()
});

const InvoiceResponseSchema = z
    .object({
        id: z.number().int(),
        label: z.string().nullable(),
        invoice_number: z.string(),
        currency: z.string(),
        amount: z.string(),
        currency_amount: z.string(),
        currency_amount_before_tax: z.string(),
        exchange_rate: z.string(),
        date: z.string().nullable(),
        deadline: z.string().nullable(),
        currency_tax: z.string(),
        tax: z.string(),
        language: z.string(),
        paid: z.boolean(),
        status: z.string(),
        draft: z.boolean(),
        special_mention: z.string().nullable(),
        customer: z.object({ id: z.number().int() }).nullable().optional(),
        ledger_entry: z.object({ id: z.number().int() }).optional(),
        quote: z.object({ id: z.number().int() }).nullable().optional(),
        billing_subscription: z.object({ id: z.number().int() }).nullable().optional(),
        credited_invoice: z.object({ id: z.number().int() }).nullable().optional(),
        customer_invoice_template: z.object({ id: z.number().int() }).nullable().optional(),
        public_file_url: z.string().nullable(),
        filename: z.string().nullable(),
        remaining_amount_with_tax: z.string().nullable(),
        remaining_amount_without_tax: z.string().nullable(),
        external_reference: z.string(),
        factur_x: z.boolean(),
        archived_at: z.string().nullable(),
        created_at: z.string(),
        updated_at: z.string()
    })
    .passthrough();

const CheckpointSchema = z.object({
    processed_after: z.string()
});

const sync = createSync({
    description: 'Continuously sync customer invoices and credit notes.',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        CustomerInvoice: CustomerInvoiceSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : undefined;
        let cursor: string | undefined;
        let hasMore = true;

        while (hasMore) {
            const params: Record<string, string | number> = { limit: 100 };
            if (cursor) {
                params['cursor'] = cursor;
            } else if (checkpoint?.processed_after) {
                params['start_date'] = checkpoint.processed_after;
            }

            const changelogResponse = await nango.get({
                // https://pennylane.readme.io/reference/getcustomerinvoiceschanges
                endpoint: '/api/external/v2/changelogs/customer_invoices',
                params,
                retries: 3
            });

            const changelogData = ChangelogResponseSchema.parse(changelogResponse.data);
            const { items, has_more, next_cursor } = changelogData;

            const pageDecisions = new Map<number, 'upsert' | 'delete'>();
            let lastProcessedAt: string | undefined;
            for (const change of items) {
                lastProcessedAt = change.processed_at;
                if (change.operation === 'delete') {
                    pageDecisions.set(change.id, 'delete');
                } else {
                    pageDecisions.set(change.id, 'upsert');
                }
            }

            const deletions: { id: string }[] = [];
            const upsertIds: number[] = [];
            for (const [id, decision] of pageDecisions) {
                if (decision === 'delete') {
                    deletions.push({ id: String(id) });
                } else {
                    upsertIds.push(id);
                }
            }

            const upserts: z.infer<typeof CustomerInvoiceSchema>[] = [];
            for (const invoiceId of upsertIds) {
                const invoiceResponse = await nango.get({
                    // https://pennylane.readme.io/reference/getcustomerinvoice
                    endpoint: `/api/external/v2/customer_invoices/${encodeURIComponent(invoiceId)}`,
                    retries: 3
                });

                const raw = InvoiceResponseSchema.parse(invoiceResponse.data);
                upserts.push({
                    id: String(raw.id),
                    ...(raw.label != null && { label: raw.label }),
                    invoice_number: raw.invoice_number,
                    currency: raw.currency,
                    amount: raw.amount,
                    currency_amount: raw.currency_amount,
                    currency_amount_before_tax: raw.currency_amount_before_tax,
                    exchange_rate: raw.exchange_rate,
                    ...(raw.date != null && { date: raw.date }),
                    ...(raw.deadline != null && { deadline: raw.deadline }),
                    currency_tax: raw.currency_tax,
                    tax: raw.tax,
                    language: raw.language,
                    paid: raw.paid,
                    status: raw.status,
                    draft: raw.draft,
                    ...(raw.special_mention != null && { special_mention: raw.special_mention }),
                    ...(raw.customer != null && { customer_id: String(raw.customer.id) }),
                    ...(raw.ledger_entry != null && { ledger_entry_id: String(raw.ledger_entry.id) }),
                    ...(raw.quote != null && { quote_id: String(raw.quote.id) }),
                    ...(raw.billing_subscription != null && { billing_subscription_id: String(raw.billing_subscription.id) }),
                    ...(raw.credited_invoice != null && { credited_invoice_id: String(raw.credited_invoice.id) }),
                    ...(raw.customer_invoice_template != null && { customer_invoice_template_id: String(raw.customer_invoice_template.id) }),
                    ...(raw.public_file_url != null && { public_file_url: raw.public_file_url }),
                    ...(raw.filename != null && { filename: raw.filename }),
                    ...(raw.remaining_amount_with_tax != null && { remaining_amount_with_tax: raw.remaining_amount_with_tax }),
                    ...(raw.remaining_amount_without_tax != null && { remaining_amount_without_tax: raw.remaining_amount_without_tax }),
                    external_reference: raw.external_reference,
                    factur_x: raw.factur_x,
                    ...(raw.archived_at != null && { archived_at: raw.archived_at }),
                    created_at: raw.created_at,
                    updated_at: raw.updated_at
                });
            }

            if (upserts.length > 0) {
                await nango.batchSave(upserts, 'CustomerInvoice');
            }

            if (deletions.length > 0) {
                await nango.batchDelete(deletions, 'CustomerInvoice');
            }

            if (lastProcessedAt !== undefined) {
                await nango.saveCheckpoint({ processed_after: lastProcessedAt });
            }

            hasMore = has_more;
            cursor = typeof next_cursor === 'string' ? next_cursor : undefined;
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
