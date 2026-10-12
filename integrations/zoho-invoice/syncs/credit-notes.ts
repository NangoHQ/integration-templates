import { createSync } from 'nango';
import { z } from 'zod';

import { ScanCheckpointSchema, scanZohoList } from '../helpers/scan.js';

const CreditNoteSchema = z
    .object({
        id: z.string().describe('Unique Zoho Invoice credit note identifier. Example: "260815000000172029".'),
        creditnote_number: z.string().optional().describe('Display number of the credit note. Example: "CN-00011".'),
        status: z.string().optional().describe('Status of the credit note. Example: "open".'),
        reference_number: z.string().optional().describe('Optional reference number entered by the user. Example: "NANGO-UCN-TEST".'),
        date: z.string().optional().describe('Credit note date in YYYY-MM-DD format. Example: "2026-10-09".'),
        issued_date: z.string().optional().describe('Date the credit note was issued in YYYY-MM-DD format. Example: "2026-10-09".'),
        total: z.number().optional().describe('Total amount of the credit note. Example: 50.0.'),
        balance: z.number().optional().describe('Outstanding (unapplied) balance of the credit note. Example: 50.0.'),
        customer_id: z.string().optional().describe('Identifier of the customer the credit note belongs to. Example: "260815000000097001".'),
        customer_name: z.string().optional().describe('Name of the customer the credit note belongs to. Example: "Acme Corp".'),
        applied_invoices: z
            .string()
            .optional()
            .describe('Summary of the invoices this credit note has been applied to, as returned by the list endpoint. Example: "".'),
        is_emailed: z.boolean().optional().describe('Whether the credit note has been emailed to the customer. Example: false.'),
        has_attachment: z.boolean().optional().describe('Whether the credit note has any attachments. Example: false.'),
        salesperson_name: z.string().optional().describe('Name of the salesperson associated with the credit note. Example: "Others".'),
        salesperson_id: z.string().optional().describe('Identifier of the salesperson associated with the credit note. Example: "-1".'),
        sales_channel: z.string().optional().describe('Sales channel of the credit note. Example: "direct_sales".'),
        is_viewed_by_client: z.boolean().optional().describe('Whether the customer has viewed the credit note. Example: false.'),
        client_viewed_time: z.string().optional().describe('Timestamp when the customer last viewed the credit note, if any. Example: "".'),
        color_code: z.string().optional().describe('Color code configured for the credit note. Example: "".'),
        current_sub_status_id: z.string().optional().describe('Identifier of the current sub status of the credit note. Example: "".'),
        current_sub_status: z.string().optional().describe('Current sub status of the credit note. Example: "open".'),
        currency_id: z.string().optional().describe('Identifier of the currency used by the credit note. Example: "260815000000000097".'),
        currency_code: z.string().optional().describe('ISO currency code of the credit note. Example: "USD".'),
        created_time: z.string().optional().describe('Timestamp when the credit note was created. Example: "2026-10-09T13:36:28-0400".'),
        last_modified_time: z
            .string()
            .optional()
            .describe('Timestamp when the credit note was last modified; used as the incremental sync watermark. Example: "2026-10-09T13:36:28-0400".'),
        exchange_rate: z.number().optional().describe('Exchange rate applied to the credit note. Example: 1.0.'),
        template_id: z.string().optional().describe('Identifier of the PDF template used for the credit note. Example: "260815000000017005".'),
        template_type: z.string().optional().describe('Type of the PDF template used for the credit note. Example: "standard".'),
        rounding_mode: z.string().optional().describe('Rounding mode applied to the credit note total. Example: "round_half_up".'),
        price_precision: z.number().optional().describe('Number of decimal places used for prices on the credit note. Example: 2.')
    })
    .describe('A credit note from Zoho Invoice, including amounts, customer, status and timestamps.');

const MetadataSchema = z
    .object({
        organization_id: z.string().describe('Zoho Invoice organization ID used to scope every API request. Example: "927270289".')
    })
    .describe('Metadata required to run the Zoho Invoice credit notes sync: the organization whose credit notes are read.');

const ProviderCreditNoteSchema = z.object({
    creditnote_id: z.string(),
    creditnote_number: z.string().optional(),
    status: z.string().optional(),
    reference_number: z.string().optional(),
    date: z.string().optional(),
    issued_date: z.string().optional(),
    total: z.number().optional(),
    balance: z.number().optional(),
    customer_id: z.string().optional(),
    customer_name: z.string().optional(),
    applied_invoices: z.string().optional(),
    is_emailed: z.boolean().optional(),
    has_attachment: z.boolean().optional(),
    salesperson_name: z.string().optional(),
    salesperson_id: z.string().optional(),
    sales_channel: z.string().optional(),
    is_viewed_by_client: z.boolean().optional(),
    client_viewed_time: z.string().optional(),
    color_code: z.string().optional(),
    current_sub_status_id: z.string().optional(),
    current_sub_status: z.string().optional(),
    currency_id: z.string().optional(),
    currency_code: z.string().optional(),
    created_time: z.string().optional(),
    last_modified_time: z.string().optional(),
    exchange_rate: z.number().optional(),
    template_id: z.string().optional(),
    template_type: z.string().optional(),
    rounding_mode: z.string().optional(),
    price_precision: z.number().optional()
});

const sync = createSync({
    description: 'Sync all credit notes from Zoho Invoice, incrementally by last_modified_time.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    scopes: ['ZohoInvoice.creditnotes.ALL'],
    metadata: MetadataSchema,
    checkpoint: ScanCheckpointSchema,
    models: {
        CreditNote: CreditNoteSchema
    },

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);
        if (!parsedMetadata.success) {
            throw new Error('Sync metadata must include organization_id to sync Zoho Invoice credit notes');
        }
        const organizationId = parsedMetadata.data.organization_id;

        // Credit notes sort by last_modified_time, so pages are fetched by keyset; a daily full listing tracks deletions.
        // https://www.zoho.com/invoice/api/v3/credit-notes/#list-all-credit-notes
        await scanZohoList(nango, {
            model: 'CreditNote',
            endpoint: '/invoice/v3/creditnotes',
            responseKey: 'creditnotes',
            organizationId: organizationId,
            sortableByLastModified: true,
            savePage: async (rows) => {
                const creditNotes: Array<z.infer<typeof CreditNoteSchema>> = [];

                for (const raw of rows) {
                    const parsed = ProviderCreditNoteSchema.safeParse(raw);
                    if (!parsed.success) {
                        throw new Error('Failed to parse credit note from provider response: ' + parsed.error.message);
                    }
                    const record = parsed.data;

                    creditNotes.push({
                        id: record.creditnote_id,
                        ...(record.creditnote_number != null && { creditnote_number: record.creditnote_number }),
                        ...(record.status != null && { status: record.status }),
                        ...(record.reference_number != null && { reference_number: record.reference_number }),
                        ...(record.date != null && { date: record.date }),
                        ...(record.issued_date != null && { issued_date: record.issued_date }),
                        ...(record.total != null && { total: record.total }),
                        ...(record.balance != null && { balance: record.balance }),
                        ...(record.customer_id != null && { customer_id: record.customer_id }),
                        ...(record.customer_name != null && { customer_name: record.customer_name }),
                        ...(record.applied_invoices != null && { applied_invoices: record.applied_invoices }),
                        ...(record.is_emailed != null && { is_emailed: record.is_emailed }),
                        ...(record.has_attachment != null && { has_attachment: record.has_attachment }),
                        ...(record.salesperson_name != null && { salesperson_name: record.salesperson_name }),
                        ...(record.salesperson_id != null && { salesperson_id: record.salesperson_id }),
                        ...(record.sales_channel != null && { sales_channel: record.sales_channel }),
                        ...(record.is_viewed_by_client != null && { is_viewed_by_client: record.is_viewed_by_client }),
                        ...(record.client_viewed_time != null && { client_viewed_time: record.client_viewed_time }),
                        ...(record.color_code != null && { color_code: record.color_code }),
                        ...(record.current_sub_status_id != null && { current_sub_status_id: record.current_sub_status_id }),
                        ...(record.current_sub_status != null && { current_sub_status: record.current_sub_status }),
                        ...(record.currency_id != null && { currency_id: record.currency_id }),
                        ...(record.currency_code != null && { currency_code: record.currency_code }),
                        ...(record.created_time != null && { created_time: record.created_time }),
                        ...(record.last_modified_time != null && { last_modified_time: record.last_modified_time }),
                        ...(record.exchange_rate != null && { exchange_rate: record.exchange_rate }),
                        ...(record.template_id != null && { template_id: record.template_id }),
                        ...(record.template_type != null && { template_type: record.template_type }),
                        ...(record.rounding_mode != null && { rounding_mode: record.rounding_mode }),
                        ...(record.price_precision != null && { price_precision: record.price_precision })
                    });
                }

                if (creditNotes.length > 0) {
                    await nango.batchSave(creditNotes, 'CreditNote');
                }
            }
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
