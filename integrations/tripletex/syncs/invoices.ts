import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const LIMIT = 100;
const FULL_REFRESH_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function extractIds(items: unknown): string[] | undefined {
    if (!Array.isArray(items)) {
        return undefined;
    }
    const ids: string[] = [];
    const IdSchema = z.object({ id: z.number() });
    for (const item of items) {
        const parsed = IdSchema.safeParse(item);
        if (parsed.success) {
            ids.push(String(parsed.data.id));
        }
    }
    return ids;
}

const ProviderInvoiceSchema = z.object({
    id: z.number(),
    version: z.number().optional(),
    url: z.string().optional(),
    invoiceNumber: z.number().optional(),
    invoiceDate: z.string(),
    invoiceDueDate: z.string(),
    customer: z.object({ id: z.number().optional() }).optional(),
    creditedInvoice: z.number().optional(),
    isCredited: z.boolean().optional(),
    kid: z.string().optional(),
    invoiceComment: z.string().optional(),
    comment: z.string().optional(),
    orders: z.array(z.object({ id: z.number().optional() }).optional()).optional(),
    orderLines: z.array(z.object({ id: z.number().optional() }).optional()).optional(),
    amount: z.number().optional(),
    amountCurrency: z.number().optional(),
    amountExcludingVat: z.number().optional(),
    amountExcludingVatCurrency: z.number().optional(),
    currency: z.object({ id: z.number().optional(), code: z.string().optional() }).optional(),
    isCreditNote: z.boolean().optional(),
    isCharged: z.boolean().optional(),
    isApproved: z.boolean().optional(),
    deliveryDate: z.string().optional(),
    documentId: z.number().optional()
});

const InvoiceSchema = z.object({
    id: z.string(),
    invoiceNumber: z.number().optional(),
    invoiceDate: z.string(),
    invoiceDueDate: z.string(),
    customerId: z.string().optional(),
    creditedInvoiceId: z.string().optional(),
    isCredited: z.boolean().optional(),
    kid: z.string().optional(),
    invoiceComment: z.string().optional(),
    comment: z.string().optional(),
    orderIds: z.array(z.string()).optional(),
    orderLineIds: z.array(z.string()).optional(),
    amount: z.number().optional(),
    amountCurrency: z.number().optional(),
    amountExcludingVat: z.number().optional(),
    amountExcludingVatCurrency: z.number().optional(),
    currencyId: z.string().optional(),
    currencyCode: z.string().optional(),
    isCreditNote: z.boolean().optional(),
    isCharged: z.boolean().optional(),
    isApproved: z.boolean().optional(),
    deliveryDate: z.string().optional(),
    documentId: z.number().optional()
});

const CheckpointSchema = z.object({
    invoice_date_from: z.string(),
    offset: z.number().int(),
    last_full_refresh: z.string()
});

const DEFAULT_CHECKPOINT = {
    invoice_date_from: '1970-01-01',
    offset: 0,
    last_full_refresh: '1970-01-01'
};

const sync = createSync({
    description: 'Sync invoices.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Invoice: InvoiceSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.parse({
            ...DEFAULT_CHECKPOINT,
            ...(checkpoint ?? {})
        });

        const today = formatDate(new Date());
        const tomorrow = formatDate(new Date(Date.now() + 24 * 60 * 60 * 1000));
        const lastFullRefresh = new Date(parsedCheckpoint.last_full_refresh);
        const needsFullRefresh = parsedCheckpoint.last_full_refresh === '1970-01-01' || Date.now() - lastFullRefresh.getTime() > FULL_REFRESH_INTERVAL_MS;

        const invoiceDateFrom = needsFullRefresh ? '1970-01-01' : parsedCheckpoint.invoice_date_from;
        const invoiceDateTo = tomorrow;

        if (needsFullRefresh) {
            await nango.trackDeletesStart('Invoice');
        }

        let offset = needsFullRefresh ? 0 : parsedCheckpoint.offset;

        const proxyConfig: ProxyConfiguration = {
            // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
            endpoint: 'v2/invoice',
            params: {
                invoiceDateFrom,
                invoiceDateTo
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'from',
                offset_start_value: offset,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: 'count',
                limit: LIMIT,
                response_path: 'values'
            },
            retries: 3
        };

        for await (const batch of nango.paginate(proxyConfig)) {
            if (!Array.isArray(batch)) {
                throw new Error('Expected batch to be an array');
            }

            const invoices = batch.map((raw) => {
                const parsed = ProviderInvoiceSchema.parse(raw);
                return {
                    id: String(parsed.id),
                    invoiceNumber: parsed.invoiceNumber,
                    invoiceDate: parsed.invoiceDate,
                    invoiceDueDate: parsed.invoiceDueDate,
                    customerId: parsed.customer?.id !== undefined ? String(parsed.customer.id) : undefined,
                    creditedInvoiceId: parsed.creditedInvoice !== undefined ? String(parsed.creditedInvoice) : undefined,
                    isCredited: parsed.isCredited,
                    kid: parsed.kid,
                    invoiceComment: parsed.invoiceComment,
                    comment: parsed.comment,
                    orderIds: extractIds(parsed.orders),
                    orderLineIds: extractIds(parsed.orderLines),
                    amount: parsed.amount,
                    amountCurrency: parsed.amountCurrency,
                    amountExcludingVat: parsed.amountExcludingVat,
                    amountExcludingVatCurrency: parsed.amountExcludingVatCurrency,
                    currencyId: parsed.currency?.id !== undefined ? String(parsed.currency.id) : undefined,
                    currencyCode: parsed.currency?.code,
                    isCreditNote: parsed.isCreditNote,
                    isCharged: parsed.isCharged,
                    isApproved: parsed.isApproved,
                    deliveryDate: parsed.deliveryDate,
                    documentId: parsed.documentId
                };
            });

            if (invoices.length > 0) {
                await nango.batchSave(invoices, 'Invoice');
            }

            if (!needsFullRefresh) {
                offset += batch.length;
                await nango.saveCheckpoint({
                    invoice_date_from: invoiceDateFrom,
                    offset,
                    last_full_refresh: parsedCheckpoint.last_full_refresh
                });
            }
        }

        if (needsFullRefresh) {
            await nango.trackDeletesEnd('Invoice');
        }

        await nango.saveCheckpoint({
            invoice_date_from: today,
            offset: 0,
            last_full_refresh: needsFullRefresh ? today : parsedCheckpoint.last_full_refresh
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
