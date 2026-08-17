import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const ProviderLineItemSchema = z.object({
    LineItemID: z.string().optional(),
    Description: z.string().optional(),
    Quantity: z.number().optional(),
    UnitAmount: z.number().optional(),
    LineAmount: z.number().optional(),
    AccountCode: z.string().optional(),
    ItemCode: z.string().optional(),
    TaxType: z.string().optional(),
    TaxAmount: z.number().optional(),
    DiscountRate: z.number().optional()
});

const ProviderContactSchema = z.object({
    ContactID: z.string(),
    Name: z.string(),
    EmailAddress: z.string().optional()
});

const ProviderCreditNoteSchema = z.object({
    CreditNoteID: z.string(),
    CreditNoteNumber: z.string().optional(),
    Type: z.string().optional(),
    Reference: z.string().optional(),
    Status: z.string(),
    SentToContact: z.boolean().optional(),
    Date: z.string().optional(),
    DueDate: z.string().optional(),
    UpdatedDateUTC: z.string(),
    CurrencyCode: z.string().optional(),
    CurrencyRate: z.number().optional(),
    SubTotal: z.number().optional(),
    TotalTax: z.number().optional(),
    Total: z.number().optional(),
    TotalDiscount: z.number().optional(),
    AmountDue: z.number().optional(),
    AmountPaid: z.number().optional(),
    AmountCredited: z.number().optional(),
    HasAttachments: z.boolean().optional(),
    BrandingThemeID: z.string().optional(),
    FullyPaidOnDate: z.string().optional(),
    LineAmountTypes: z.string().optional(),
    Contact: ProviderContactSchema.optional(),
    LineItems: z.array(ProviderLineItemSchema).optional()
});

const CreditNoteSchema = z
    .object({
        id: z.string().describe('Unique Xero identifier for the credit note'),
        CreditNoteNumber: z.string().optional().describe('Xero-assigned credit note number'),
        Type: z.string().optional().describe('Credit note type (ACCPAYCREDIT or ACCRECCREDIT)'),
        Reference: z.string().optional().describe('Reference text for the credit note'),
        Status: z.string().describe('Status of the credit note (DRAFT, SUBMITTED, AUTHORISED, PAID, VOIDED, DELETED)'),
        SentToContact: z.boolean().optional().describe('Whether the credit note has been sent to the contact'),
        Date: z.string().optional().describe('Date the credit note was issued (YYYY-MM-DD)'),
        DueDate: z.string().optional().describe('Date the credit note is due (YYYY-MM-DD)'),
        UpdatedDateUTC: z.string().describe('Last modified timestamp in UTC'),
        CurrencyCode: z.string().optional().describe('Currency code (e.g., USD, GBP)'),
        CurrencyRate: z.number().optional().describe('Exchange rate to the base currency'),
        SubTotal: z.number().optional().describe('Subtotal excluding taxes'),
        TotalTax: z.number().optional().describe('Total tax amount'),
        Total: z.number().optional().describe('Total amount including tax'),
        TotalDiscount: z.number().optional().describe('Total discount applied'),
        AmountDue: z.number().optional().describe('Amount remaining to be paid or credited'),
        AmountPaid: z.number().optional().describe('Amount already paid against the credit note'),
        AmountCredited: z.number().optional().describe('Amount already credited to other invoices'),
        HasAttachments: z.boolean().optional().describe('Whether the credit note has file attachments'),
        BrandingThemeID: z.string().optional().describe('Identifier of the branding theme applied'),
        FullyPaidOnDate: z.string().optional().describe('Date when the credit note was fully paid or credited (YYYY-MM-DD)'),
        LineAmountTypes: z.string().optional().describe('Line amount calculation method (Exclusive, Inclusive, or NoTax)'),
        Contact: z
            .object({
                ContactID: z.string().describe('Unique Xero identifier for the contact'),
                Name: z.string().describe('Display name of the contact'),
                EmailAddress: z.string().optional().describe('Primary email address of the contact')
            })
            .optional()
            .describe('Contact associated with the credit note'),
        LineItems: z
            .array(
                z.object({
                    LineItemID: z.string().optional().describe('Unique identifier for the line item'),
                    Description: z.string().optional().describe('Description of the line item'),
                    Quantity: z.number().optional().describe('Quantity of units'),
                    UnitAmount: z.number().optional().describe('Price per unit'),
                    LineAmount: z.number().optional().describe('Total line amount'),
                    AccountCode: z.string().optional().describe('Account code for the line item'),
                    ItemCode: z.string().optional().describe('Inventory item code if applicable'),
                    TaxType: z.string().optional().describe('Tax type applied to the line item'),
                    TaxAmount: z.number().optional().describe('Tax amount for the line item'),
                    DiscountRate: z.number().optional().describe('Discount percentage applied to the line item')
                })
            )
            .optional()
            .describe('Individual line items on the credit note')
    })
    .describe('A Xero credit note issued to adjust or refund an invoice');

type CreditNoteType = z.infer<typeof CreditNoteSchema>;
type ProviderCreditNoteType = z.infer<typeof ProviderCreditNoteSchema>;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
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

function mapCreditNote(note: ProviderCreditNoteType): CreditNoteType {
    return {
        id: note.CreditNoteID,
        CreditNoteNumber: note.CreditNoteNumber,
        Type: note.Type,
        Reference: note.Reference,
        Status: note.Status,
        SentToContact: note.SentToContact,
        Date: note.Date,
        DueDate: note.DueDate,
        UpdatedDateUTC: note.UpdatedDateUTC,
        CurrencyCode: note.CurrencyCode,
        CurrencyRate: note.CurrencyRate,
        SubTotal: note.SubTotal,
        TotalTax: note.TotalTax,
        Total: note.Total,
        TotalDiscount: note.TotalDiscount,
        AmountDue: note.AmountDue,
        AmountPaid: note.AmountPaid,
        AmountCredited: note.AmountCredited,
        HasAttachments: note.HasAttachments,
        BrandingThemeID: note.BrandingThemeID,
        FullyPaidOnDate: note.FullyPaidOnDate,
        LineAmountTypes: note.LineAmountTypes,
        Contact: note.Contact,
        LineItems: note.LineItems
    };
}

const sync = createSync({
    description: 'Sync credit notes from Xero.',
    version: '3.1.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        CreditNote: CreditNoteSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        const rawConnection = await nango.getConnection();
        const connectionConfig = isRecord(rawConnection.connection_config) ? rawConnection.connection_config : undefined;
        const metadata = isRecord(rawConnection.metadata) ? rawConnection.metadata : undefined;

        let tenantId: string | undefined;

        if (connectionConfig && typeof connectionConfig['tenant_id'] === 'string' && connectionConfig['tenant_id'].length > 0) {
            tenantId = connectionConfig['tenant_id'];
        } else if (metadata && typeof metadata['tenantId'] === 'string' && metadata['tenantId'].length > 0) {
            tenantId = metadata['tenantId'];
        } else {
            // https://developer.xero.com/documentation/api/accounting/overview
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const connectionsData = Array.isArray(connectionsResponse.data) ? connectionsResponse.data : [];

            if (connectionsData.length === 0) {
                throw new Error('No Xero tenants found for this connection.');
            }

            if (connectionsData.length > 1) {
                throw new Error('Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.');
            }

            const first = isRecord(connectionsData[0]) ? connectionsData[0] : undefined;
            if (first && typeof first['tenantId'] === 'string' && first['tenantId'].length > 0) {
                tenantId = first['tenantId'];
            }
        }

        if (!tenantId) {
            throw new Error('Unable to resolve xero-tenant-id.');
        }

        const headers: Record<string, string> = {
            'xero-tenant-id': tenantId
        };
        const params: Record<string, string> = {};

        if (checkpoint && typeof checkpoint.updated_after === 'string' && checkpoint.updated_after.length > 0) {
            headers['If-Modified-Since'] = checkpoint.updated_after;
            params['includeArchived'] = 'true';
        }

        const proxyConfig: ProxyConfiguration = {
            // https://developer.xero.com/documentation/api/accounting/overview
            endpoint: 'api.xro/2.0/CreditNotes',
            headers,
            params,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'pageSize',
                limit: 100,
                response_path: 'CreditNotes'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const parsedNotes = page.map((item: unknown) => ProviderCreditNoteSchema.parse(item));

            if (parsedNotes.length === 0) {
                continue;
            }

            const activeNotes = parsedNotes.filter((note) => note.Status !== 'DELETED' && note.Status !== 'VOIDED').map(mapCreditNote);
            const deletedNotes = parsedNotes.filter((note) => note.Status === 'DELETED' || note.Status === 'VOIDED').map(mapCreditNote);

            if (activeNotes.length > 0) {
                await nango.batchSave(activeNotes, 'CreditNote');
            }

            if (checkpoint && deletedNotes.length > 0) {
                await nango.batchDelete(deletedNotes, 'CreditNote');
            }

            let latestUpdatedDate: Date | null = null;
            for (const note of parsedNotes) {
                const parsedDate = parseXeroDate(note.UpdatedDateUTC);
                if (parsedDate && (!latestUpdatedDate || parsedDate > latestUpdatedDate)) {
                    latestUpdatedDate = parsedDate;
                }
            }

            if (latestUpdatedDate) {
                await nango.saveCheckpoint({ updated_after: formatIfModifiedSince(latestUpdatedDate) });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
