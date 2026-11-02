import { z } from 'zod';
import { createTool } from 'nango';
import type { HttpResponse } from 'nango';

const PERIODS_INCLUDING_TODAY: ReadonlySet<string> = new Set(['this_week', 'this_month', 'this_quarter', 'this_year']);

const InputSchema = z
    .object({
        administrationId: z.string().min(1).describe('Administration whose invoices to browse.'),
        limit: z.number().int().min(1).max(100).optional().describe('Maximum invoices in this page; provisional supported range 1–100, default 50.'),
        order: z.enum(['newest_first', 'oldest_first']).optional().describe('Invoice-date ordering; newest_first maps to date_desc.'),
        cursor: z.string().min(1).optional().describe('Opaque continuation from the same administration and unchanged filters, order and limit.'),
        period: z
            .enum([
                'this_week',
                'prev_week',
                'next_week',
                'this_month',
                'prev_month',
                'next_month',
                'this_quarter',
                'prev_quarter',
                'next_quarter',
                'this_year',
                'prev_year',
                'next_year'
            ])
            .optional()
            .describe('Relative invoice-date period; omit this and explicit date bounds for all dates.'),
        states: z
            .array(z.enum(['draft', 'open', 'scheduled', 'pending_payment', 'late', 'reminded', 'paid', 'uncollectible']))
            .min(1)
            .optional()
            .describe('Lifecycle states to include; omitted means all states.')
            .meta({ uniqueItems: true }),
        invoiceDateFrom: z.iso.date().optional().describe('Inclusive invoice-date start; requires invoiceDateThrough and cannot be combined with period.'),
        invoiceDateThrough: z.iso.date().optional().describe('Inclusive invoice-date end; requires invoiceDateFrom; range must not exceed ten years.')
    })
    .describe('Filters and pagination for browsing one page of sales invoices in one administration.')
    .meta({
        dependentRequired: { invoiceDateFrom: ['invoiceDateThrough'], invoiceDateThrough: ['invoiceDateFrom'] },
        not: { required: ['invoiceDateFrom', 'period'] }
    });

const InvoiceSummarySchema = z.object({
    id: z.string().describe('Internal sales invoice ID for follow-up tools.'),
    state: z.string().optional().describe('Moneybird invoice lifecycle state.'),
    paused: z.boolean().optional().describe('Whether automatic workflow steps are paused.'),
    dueDate: z.iso.date().optional().describe('Payment due calendar date when available.'),
    currency: z.string().optional().describe('Currency code for returned monetary values.'),
    contactId: z.string().optional().describe('Customer contact ID.'),
    reference: z.string().nullable().optional().describe('Customer-visible reference, retaining null or empty text.'),
    invoiceDate: z.iso.date().nullable().optional().describe('Invoice calendar date, or null when unset.'),
    totalUnpaid: z.string().optional().describe('Exact outstanding amount in invoice currency.'),
    invoiceNumber: z.string().nullable().optional().describe('Issued invoice number; null for a draft.'),
    totalIncludingTax: z.string().optional().describe('Exact total including tax in invoice currency.')
});

const OutputSchema = z
    .object({
        items: z.array(InvoiceSummarySchema).describe('One provider page of invoice summaries, possibly empty.'),
        nextCursor: z.string().optional().describe('Opaque continuation for another page; omitted when exhausted.')
    })
    .describe('One page of sales invoice summaries and the opaque continuation for the next page.');

const ProviderInvoiceSchema = z.object({
    id: z.union([z.string(), z.number()]),
    invoice_id: z.string().nullable().optional(),
    contact_id: z.union([z.string(), z.number()]).optional(),
    state: z.string().optional(),
    paused: z.boolean().optional(),
    invoice_date: z.string().nullable().optional(),
    due_date: z.string().nullable().optional(),
    reference: z.string().nullable().optional(),
    currency: z.string().optional(),
    total_price_incl_tax: z.string().optional(),
    total_unpaid: z.string().optional()
});

const ProviderResponseSchema = z.array(ProviderInvoiceSchema);

const CursorSchema = z.object({
    v: z.literal(1),
    a: z.string().min(1),
    f: z.string().min(1),
    s: z.enum(['date_desc', 'date_asc']),
    n: z.number().int().min(1).max(100),
    p: z.number().int().min(1)
});

type CursorPayload = z.infer<typeof CursorSchema>;

function httpErrorStatus(error: unknown): number | undefined {
    if (typeof error !== 'object' || error === null || !('response' in error)) {
        return undefined;
    }
    const response: unknown = error.response;
    if (typeof response !== 'object' || response === null || !('status' in response)) {
        return undefined;
    }
    const status: unknown = response.status;
    return typeof status === 'number' ? status : undefined;
}

function findLinkHeader(headers: Record<string, unknown>): string | undefined {
    for (const [key, value] of Object.entries(headers)) {
        if (key === 'Link' && typeof value === 'string') {
            return value;
        }
    }
    return undefined;
}

function linkHeaderHasNext(linkHeader: string | undefined): boolean {
    if (linkHeader === undefined) {
        return false;
    }
    return linkHeader.split(',').some((part) =>
        part
            .split(';')
            .slice(1)
            .some((attribute) => attribute.trim().toLowerCase() === 'rel="next"')
    );
}

function encodeCursor(payload: CursorPayload): string {
    return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function decodeCursor(cursor: string): CursorPayload {
    let decoded: unknown;
    // @allowTryCatch: decoding a malformed cursor throws inside JSON.parse; surface it as the public validation_failed code instead of a raw SyntaxError.
    try {
        decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    } catch {
        throw new Error('validation_failed: cursor is malformed; start a new browse without cursor and keep the filters, order and limit unchanged.');
    }
    const parsed = CursorSchema.safeParse(decoded);
    if (!parsed.success) {
        throw new Error('validation_failed: cursor is malformed; start a new browse without cursor and keep the filters, order and limit unchanged.');
    }
    return parsed.data;
}

/**
 * @tags: [read]
 * @tagReason: Only reads one filtered page of sales invoices from Moneybird; it never mutates provider data.
 * @pitfalls: oldest_first fails with unsupported_sort when drafts or scheduled invoices are included and the period contains today; use newest_first, only issued states, or a period excluding today. Drafts without an invoice date only match a period that contains today, so browse drafts without a period to see them all. Pages are not a consistent snapshot, so records can appear or move between calls.
 */
const tool = createTool({
    name: 'list-sales-invoices',
    description: 'Browse one page of sales invoices, optionally filtered by lifecycle state and invoice-date period.',
    input: InputSchema,
    output: OutputSchema,
    meta: {
        instructions:
            "Use this to find invoice record IDs, including drafts. Use `get-sales-invoice` for invoice lines, notes, attachments and payments or a known invoice number/reference. Pass nextCursor back as cursor with unchanged filters, order and limit. Default browsing includes all states and dates, newest invoice date first. Ascending order has a Moneybird restriction when drafts or scheduled invoices and today's date are included.",
        requiredScopes: ['sales_invoices'],
        tags: { read_only_hint: 'true', destructive_hint: 'false', idempotent_hint: 'true' }
    },
    exec: async (nango, trigger): Promise<z.infer<typeof OutputSchema>> => {
        const input = trigger.input;

        if (input.period !== undefined && (input.invoiceDateFrom !== undefined || input.invoiceDateThrough !== undefined)) {
            throw new Error(
                'validation_failed: period cannot be combined with invoiceDateFrom or invoiceDateThrough; use either the relative period or explicit date bounds.'
            );
        }
        if ((input.invoiceDateFrom === undefined) !== (input.invoiceDateThrough === undefined)) {
            throw new Error('validation_failed: invoiceDateFrom and invoiceDateThrough must be supplied together.');
        }
        if (input.invoiceDateFrom !== undefined && input.invoiceDateThrough !== undefined) {
            if (input.invoiceDateFrom > input.invoiceDateThrough) {
                throw new Error('validation_failed: invoiceDateFrom is after invoiceDateThrough; correct the date bounds.');
            }
            const from = new Date(`${input.invoiceDateFrom}T00:00:00.000Z`);
            const through = new Date(`${input.invoiceDateThrough}T00:00:00.000Z`);
            const latest = new Date(from);
            latest.setUTCFullYear(latest.getUTCFullYear() + 10);
            if (through.getTime() > latest.getTime()) {
                throw new Error('validation_failed: the invoice date range must not exceed ten years; narrow the bounds.');
            }
        }

        const order = input.order ?? 'newest_first';
        const sort: 'date_desc' | 'date_asc' = order === 'oldest_first' ? 'date_asc' : 'date_desc';
        const perPage = input.limit ?? 50;

        if (order === 'oldest_first') {
            const includesDraftOrScheduled = input.states === undefined || input.states.includes('draft') || input.states.includes('scheduled');
            let periodIncludesToday = true;
            if (input.period !== undefined) {
                periodIncludesToday = PERIODS_INCLUDING_TODAY.has(input.period);
            } else if (input.invoiceDateFrom !== undefined && input.invoiceDateThrough !== undefined) {
                const today = new Date().toISOString().slice(0, 10);
                periodIncludesToday = input.invoiceDateFrom <= today && today <= input.invoiceDateThrough;
            }
            if (includesDraftOrScheduled && periodIncludesToday) {
                throw new Error(
                    'unsupported_sort: Moneybird cannot sort ascending by invoice date when drafts or scheduled invoices are included and the period contains today; use newest_first, restrict states to issued invoices, or select a period excluding today.'
                );
            }
        }

        const stateTerm = input.states === undefined ? 'all' : input.states.join('|');
        const filterTerms = [`state:${stateTerm}`];
        if (input.period !== undefined) {
            filterTerms.push(`period:${input.period}`);
        } else if (input.invoiceDateFrom !== undefined && input.invoiceDateThrough !== undefined) {
            filterTerms.push(`period:${input.invoiceDateFrom.replaceAll('-', '')}..${input.invoiceDateThrough.replaceAll('-', '')}`);
        }
        const filter = filterTerms.join(',');

        let page = 1;
        if (input.cursor !== undefined) {
            const continuation = decodeCursor(input.cursor);
            if (continuation.a !== input.administrationId || continuation.f !== filter || continuation.s !== sort || continuation.n !== perPage) {
                throw new Error(
                    'validation_failed: cursor does not match this administration, filters, order and limit; start a new browse without cursor and keep continuation arguments unchanged.'
                );
            }
            page = continuation.p;
        }

        let response: HttpResponse<unknown>;
        // @allowTryCatch: Moneybird's documented 400 and 401/403 failures must surface as the public validation_failed and permission_denied codes instead of raw proxy errors.
        try {
            // https://developer.moneybird.com/api/sales-invoices#list-all-invoices
            response = await nango.get({
                endpoint: `/v2/${encodeURIComponent(input.administrationId)}/sales_invoices.json`,
                params: {
                    filter,
                    sort,
                    per_page: perPage,
                    page
                },
                retries: 3
            });
        } catch (error) {
            const status = httpErrorStatus(error);
            if (status === 401 || status === 403) {
                throw new Error('permission_denied: Sales invoice access is missing; ask for sales_invoices access to the administration.');
            }
            if (status === 400) {
                throw new Error(
                    'validation_failed: Moneybird rejected the query; correct the dates or start a new browse without cursor and keep continuation arguments unchanged.'
                );
            }
            throw error;
        }

        const invoices = ProviderResponseSchema.parse(response.data);

        const items: z.infer<typeof InvoiceSummarySchema>[] = invoices.map((invoice) => ({
            id: String(invoice.id),
            ...(invoice.state !== undefined && { state: invoice.state }),
            ...(invoice.paused !== undefined && { paused: invoice.paused }),
            ...(typeof invoice.due_date === 'string' && { dueDate: invoice.due_date }),
            ...(invoice.currency !== undefined && { currency: invoice.currency }),
            ...(invoice.contact_id !== undefined && { contactId: String(invoice.contact_id) }),
            ...(invoice.reference !== undefined && { reference: invoice.reference }),
            ...(invoice.invoice_date !== undefined && { invoiceDate: invoice.invoice_date }),
            ...(invoice.total_unpaid !== undefined && { totalUnpaid: invoice.total_unpaid }),
            ...(invoice.invoice_id !== undefined && { invoiceNumber: invoice.invoice_id }),
            ...(invoice.total_price_incl_tax !== undefined && { totalIncludingTax: invoice.total_price_incl_tax })
        }));

        const hasNextPage = linkHeaderHasNext(findLinkHeader(response.headers));

        return {
            items,
            ...(hasNextPage && { nextCursor: encodeCursor({ v: 1, a: input.administrationId, f: filter, s: sort, n: perPage, p: page + 1 }) })
        };
    }
});

export default tool;
