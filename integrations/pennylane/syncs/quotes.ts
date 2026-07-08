import { createSync } from 'nango';
import { z } from 'zod';

const CheckpointSchema = z.object({
    start_date: z.string(),
    cursor: z.string()
});

const QuoteChangeSchema = z.object({
    id: z.number(),
    operation: z.enum(['insert', 'update', 'delete']),
    processed_at: z.string(),
    updated_at: z.string(),
    created_at: z.string()
});

const ChangelogResponseSchema = z.object({
    items: z.array(QuoteChangeSchema),
    has_more: z.boolean(),
    next_cursor: z.string().nullable()
});

const ProviderQuoteSchema = z.object({
    id: z.number(),
    label: z.string().nullable(),
    quote_number: z.string(),
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
    status: z.enum(['pending', 'accepted', 'denied', 'invoiced', 'expired']),
    discount: z
        .object({
            type: z.string(),
            value: z.string()
        })
        .optional(),
    public_file_url: z.string().nullable(),
    filename: z.string().nullable(),
    special_mention: z.string().nullable(),
    customer: z
        .object({
            id: z.number(),
            url: z.string()
        })
        .nullable(),
    invoice_line_sections: z
        .object({
            url: z.string()
        })
        .optional(),
    invoice_lines: z
        .object({
            url: z.string()
        })
        .optional(),
    linked_invoices: z
        .object({
            url: z.string()
        })
        .optional(),
    pdf_invoice_free_text: z.string().optional(),
    pdf_invoice_subject: z.string().optional(),
    pdf_description: z.string().nullable(),
    quote_template: z
        .object({
            id: z.number()
        })
        .nullable(),
    appendices: z
        .object({
            url: z.string()
        })
        .optional(),
    external_reference: z.string(),
    archived_at: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string()
});

const QuoteSchema = z.object({
    id: z.string(),
    label: z.string().optional(),
    quote_number: z.string(),
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
    status: z.enum(['pending', 'accepted', 'denied', 'invoiced', 'expired']),
    discount_type: z.string().optional(),
    discount_value: z.string().optional(),
    public_file_url: z.string().optional(),
    filename: z.string().optional(),
    special_mention: z.string().optional(),
    customer_id: z.string().optional(),
    invoice_line_sections_url: z.string().optional(),
    invoice_lines_url: z.string().optional(),
    linked_invoices_url: z.string().optional(),
    pdf_invoice_free_text: z.string().optional(),
    pdf_invoice_subject: z.string().optional(),
    pdf_description: z.string().optional(),
    quote_template_id: z.string().optional(),
    appendices_url: z.string().optional(),
    external_reference: z.string().optional(),
    archived_at: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string()
});

const sync = createSync({
    description: 'Continuously sync quotes.',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Quote: QuoteSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : undefined;
        let cursor: string | undefined = checkpoint?.cursor || undefined;
        if (cursor === '') {
            cursor = undefined;
        }
        let hasMore = true;

        while (hasMore) {
            const params: Record<string, string | number> = {
                limit: 100
            };

            if (cursor) {
                params['cursor'] = cursor;
            } else if (checkpoint && checkpoint['start_date']) {
                params['start_date'] = checkpoint['start_date'];
            }

            // https://pennylane.readme.io/reference/getquotechanges
            const response = await nango.get({
                endpoint: '/api/external/v2/changelogs/quotes',
                params,
                retries: 3
            });

            const parsed = ChangelogResponseSchema.parse(response.data);
            const changes = parsed.items;
            hasMore = parsed.has_more && parsed.next_cursor != null;
            cursor = parsed.next_cursor ?? undefined;

            const changeMap = new Map<number, 'upsert' | 'delete'>();
            let lastProcessedAt: string | undefined;

            for (const change of changes) {
                changeMap.set(change.id, change.operation === 'delete' ? 'delete' : 'upsert');
                if (!lastProcessedAt || change.processed_at > lastProcessedAt) {
                    lastProcessedAt = change.processed_at;
                }
            }

            const upsertIds: number[] = [];
            const deletions: Array<{ id: string }> = [];

            for (const [id, operation] of changeMap) {
                if (operation === 'delete') {
                    deletions.push({ id: String(id) });
                } else {
                    upsertIds.push(id);
                }
            }

            if (deletions.length > 0) {
                await nango.batchDelete(deletions, 'Quote');
            }

            if (upsertIds.length > 0) {
                const quotes: Array<z.infer<typeof QuoteSchema>> = [];
                for (const id of upsertIds) {
                    // https://pennylane.readme.io/reference/getquote
                    const quoteResponse = await nango.get({
                        endpoint: `/api/external/v2/quotes/${encodeURIComponent(String(id))}`,
                        retries: 3
                    });
                    const quote = ProviderQuoteSchema.parse(quoteResponse.data);
                    quotes.push({
                        id: String(quote.id),
                        ...(quote.label != null && { label: quote.label }),
                        quote_number: quote.quote_number,
                        currency: quote.currency,
                        amount: quote.amount,
                        currency_amount: quote.currency_amount,
                        currency_amount_before_tax: quote.currency_amount_before_tax,
                        exchange_rate: quote.exchange_rate,
                        ...(quote.date != null && { date: quote.date }),
                        ...(quote.deadline != null && { deadline: quote.deadline }),
                        currency_tax: quote.currency_tax,
                        tax: quote.tax,
                        language: quote.language,
                        status: quote.status,
                        ...(quote.discount && {
                            discount_type: quote.discount.type,
                            discount_value: quote.discount.value
                        }),
                        ...(quote.public_file_url != null && { public_file_url: quote.public_file_url }),
                        ...(quote.filename != null && { filename: quote.filename }),
                        ...(quote.special_mention != null && { special_mention: quote.special_mention }),
                        ...(quote.customer != null && { customer_id: String(quote.customer.id) }),
                        ...(quote.invoice_line_sections && { invoice_line_sections_url: quote.invoice_line_sections.url }),
                        ...(quote.invoice_lines && { invoice_lines_url: quote.invoice_lines.url }),
                        ...(quote.linked_invoices && { linked_invoices_url: quote.linked_invoices.url }),
                        ...(quote.pdf_invoice_free_text && { pdf_invoice_free_text: quote.pdf_invoice_free_text }),
                        ...(quote.pdf_invoice_subject && { pdf_invoice_subject: quote.pdf_invoice_subject }),
                        ...(quote.pdf_description != null && { pdf_description: quote.pdf_description }),
                        ...(quote.quote_template != null && { quote_template_id: String(quote.quote_template.id) }),
                        ...(quote.appendices && { appendices_url: quote.appendices.url }),
                        ...(quote.external_reference && { external_reference: quote.external_reference }),
                        ...(quote.archived_at != null && { archived_at: quote.archived_at }),
                        created_at: quote.created_at,
                        updated_at: quote.updated_at
                    });
                }
                await nango.batchSave(quotes, 'Quote');
            }

            if (lastProcessedAt) {
                await nango.saveCheckpoint({ start_date: lastProcessedAt, cursor: cursor || '' });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
