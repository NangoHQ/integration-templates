import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderContactSchema = z.object({
    ContactID: z.string().optional(),
    Name: z.string().optional()
});

const ProviderInvoiceSchema = z.object({
    InvoiceID: z.string(),
    InvoiceNumber: z.string().optional(),
    Type: z.string().optional(),
    Status: z.string().optional(),
    Contact: ProviderContactSchema.optional(),
    Date: z.string().optional(),
    DueDate: z.string().optional(),
    UpdatedDateUTC: z.string(),
    Total: z.number().optional(),
    TotalTax: z.number().optional(),
    AmountDue: z.number().optional(),
    AmountPaid: z.number().optional(),
    AmountCredited: z.number().optional(),
    CurrencyCode: z.string().optional(),
    Reference: z.string().optional(),
    SentToContact: z.boolean().optional(),
    HasAttachments: z.boolean().optional(),
    Url: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const InvoiceSchema = z
    .object({
        id: z.string().describe('Unique Xero identifier for the invoice.'),
        invoiceNumber: z.string().optional().describe('Customer-facing invoice number.'),
        type: z.string().optional().describe('Invoice type, e.g. ACCREC or ACCPAY.'),
        status: z.string().optional().describe('Current status, e.g. AUTHORISED, DRAFT, DELETED, VOIDED.'),
        contactId: z.string().optional().describe('Identifier of the associated contact.'),
        contactName: z.string().optional().describe('Name of the associated contact.'),
        date: z.string().optional().describe('Invoice date in ISO 8601 format.'),
        dueDate: z.string().optional().describe('Due date in ISO 8601 format.'),
        updatedDateUtc: z.string().describe('Last modification timestamp in UTC.'),
        total: z.number().optional().describe('Total invoice amount including tax.'),
        totalTax: z.number().optional().describe('Total tax amount.'),
        amountDue: z.number().optional().describe('Outstanding amount due.'),
        amountPaid: z.number().optional().describe('Amount already paid.'),
        amountCredited: z.number().optional().describe('Total credit note amount applied.'),
        currencyCode: z.string().optional().describe('Currency code, e.g. USD.'),
        reference: z.string().optional().describe('User-defined reference text.'),
        sentToContact: z.boolean().optional().describe('Whether the invoice has been emailed to the contact.'),
        hasAttachments: z.boolean().optional().describe('Whether the invoice has file attachments.'),
        url: z.string().optional().describe('Online invoice URL if enabled.')
    })
    .describe('A Xero invoice record.');

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isArray(value: unknown): value is unknown[] {
    return Array.isArray(value);
}

function parseXeroDate(value: string): Date | null {
    // Allow negative timestamps for pre-1970 Xero dates (see general-ledger.ts parseDate).
    const match = value.match(/^\/Date\((-?\d+)(?:[+-]\d{4})?\)\/$/);
    if (match && match[1]) {
        return new Date(parseInt(match[1], 10));
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return parsed;
}

function formatIfModifiedSince(date: Date): string {
    return date.toISOString().replace(/\.\d{3}Z$/, '');
}

async function resolveTenantId(nango: NangoSyncLocal): Promise<string> {
    const rawConnection = await nango.getConnection();
    if (isRecord(rawConnection)) {
        const connectionConfig = rawConnection['connection_config'];
        if (isRecord(connectionConfig)) {
            const tenantId = connectionConfig['tenant_id'];
            if (typeof tenantId === 'string' && tenantId.length > 0) {
                return tenantId;
            }
        }
        const metadata = rawConnection['metadata'];
        if (isRecord(metadata)) {
            const tenantId = metadata['tenantId'];
            if (typeof tenantId === 'string' && tenantId.length > 0) {
                return tenantId;
            }
        }
    }

    const response = await nango.get({
        // https://developer.xero.com/documentation/api/accounting/overview
        endpoint: 'connections',
        retries: 10
    });
    if (!isRecord(response) || !isArray(response.data) || response.data.length === 0) {
        throw new Error('No Xero tenants found for this connection.');
    }
    if (response.data.length > 1) {
        throw new Error('Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.');
    }
    const first = response.data[0];
    if (!isRecord(first)) {
        throw new Error('Unable to resolve xero-tenant-id.');
    }
    const tenantId = first['tenantId'];
    if (typeof tenantId !== 'string' || tenantId.length === 0) {
        throw new Error('Unable to resolve xero-tenant-id.');
    }
    return tenantId;
}

function mapInvoice(raw: unknown): z.infer<typeof InvoiceSchema> {
    const parsed = ProviderInvoiceSchema.parse(raw);
    const contactId = parsed.Contact?.ContactID;
    const contactName = parsed.Contact?.Name;
    const result: z.infer<typeof InvoiceSchema> = {
        id: parsed.InvoiceID,
        updatedDateUtc: parsed.UpdatedDateUTC
    };
    if (parsed.InvoiceNumber !== undefined) {
        result.invoiceNumber = parsed.InvoiceNumber;
    }
    if (parsed.Type !== undefined) {
        result.type = parsed.Type;
    }
    if (parsed.Status !== undefined) {
        result.status = parsed.Status;
    }
    if (contactId !== undefined) {
        result.contactId = contactId;
    }
    if (contactName !== undefined) {
        result.contactName = contactName;
    }
    if (parsed.Date !== undefined) {
        result.date = parsed.Date;
    }
    if (parsed.DueDate !== undefined) {
        result.dueDate = parsed.DueDate;
    }
    if (parsed.Total !== undefined) {
        result.total = parsed.Total;
    }
    if (parsed.TotalTax !== undefined) {
        result.totalTax = parsed.TotalTax;
    }
    if (parsed.AmountDue !== undefined) {
        result.amountDue = parsed.AmountDue;
    }
    if (parsed.AmountPaid !== undefined) {
        result.amountPaid = parsed.AmountPaid;
    }
    if (parsed.AmountCredited !== undefined) {
        result.amountCredited = parsed.AmountCredited;
    }
    if (parsed.CurrencyCode !== undefined) {
        result.currencyCode = parsed.CurrencyCode;
    }
    if (parsed.Reference !== undefined) {
        result.reference = parsed.Reference;
    }
    if (parsed.SentToContact !== undefined) {
        result.sentToContact = parsed.SentToContact;
    }
    if (parsed.HasAttachments !== undefined) {
        result.hasAttachments = parsed.HasAttachments;
    }
    if (parsed.Url !== undefined) {
        result.url = parsed.Url;
    }
    return result;
}

const sync = createSync({
    description: 'Sync invoices from Xero.',
    version: '3.1.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Invoice: InvoiceSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint != null ? CheckpointSchema.parse(rawCheckpoint) : null;
        const updatedAfter = checkpoint?.updated_after ?? '';
        const isIncremental = updatedAfter.length > 0;

        const tenantId = await resolveTenantId(nango);

        const headers: Record<string, string> = {
            'xero-tenant-id': tenantId
        };
        const params: Record<string, string> = {
            summaryOnly: 'true'
        };

        if (isIncremental) {
            headers['If-Modified-Since'] = updatedAfter;
            params['includeArchived'] = 'true';
        }

        const proxyConfig: ProxyConfiguration = {
            // https://developer.xero.com/documentation/api/accounting/overview
            endpoint: 'api.xro/2.0/Invoices',
            headers,
            params,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'pageSize',
                limit: 100,
                response_path: 'Invoices'
            },
            retries: 3
        };

        let latestUpdatedDate: Date | null = isIncremental ? parseXeroDate(updatedAfter) : null;
        let latestUpdatedDateUtc = updatedAfter;

        for await (const page of nango.paginate(proxyConfig)) {
            const active: z.infer<typeof InvoiceSchema>[] = [];
            const stale: z.infer<typeof InvoiceSchema>[] = [];
            for (const raw of page) {
                const mapped = mapInvoice(raw);
                if (mapped.status === 'DELETED' || mapped.status === 'VOIDED') {
                    stale.push(mapped);
                } else {
                    active.push(mapped);
                }
                const parsedDate = parseXeroDate(mapped.updatedDateUtc);
                if (parsedDate && (!latestUpdatedDate || parsedDate > latestUpdatedDate)) {
                    latestUpdatedDate = parsedDate;
                    latestUpdatedDateUtc = formatIfModifiedSince(parsedDate);
                }
            }
            if (active.length > 0) {
                await nango.batchSave(active, 'Invoice');
            }
            if (isIncremental && stale.length > 0) {
                await nango.batchDelete(stale, 'Invoice');
            }
            if (latestUpdatedDateUtc.length > 0) {
                await nango.saveCheckpoint({ updated_after: latestUpdatedDateUtc });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
