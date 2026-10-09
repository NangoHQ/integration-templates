import { createSync } from 'nango';
import { z } from 'zod';

import { OrganizationMetadataSchema, resolveSyncOrganizationId } from '../helpers/organization.js';
import { paginateByLastModifiedTime } from '../helpers/pagination.js';

// Internal schemas describing the subset of the Zoho Inventory API response that this
// sync reads. They only serve to parse unknown provider data; no descriptions required.
const ProviderAddressSchema = z.object({
    address: z.string().optional(),
    street2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipcode: z.string().optional(),
    country: z.string().optional(),
    phone: z.string().optional(),
    fax: z.string().optional(),
    attention: z.string().optional()
});

const ProviderCustomFieldSchema = z.object({
    customfield_id: z.union([z.string(), z.number()]).optional(),
    label: z.string().optional(),
    value: z.unknown().optional(),
    show_on_pdf: z.boolean().optional()
});

const ProviderInvoiceSchema = z.object({
    invoice_id: z.union([z.string(), z.number()]),
    ach_payment_initiated: z.boolean().optional(),
    zcrm_potential_id: z.union([z.string(), z.number()]).optional(),
    zcrm_potential_name: z.string().optional(),
    customer_id: z.union([z.string(), z.number()]).optional(),
    customer_name: z.string().optional(),
    company_name: z.string().optional(),
    status: z.string().optional(),
    invoice_number: z.string().optional(),
    reference_number: z.string().optional(),
    date: z.string().optional(),
    due_date: z.string().optional(),
    issued_date: z.string().optional(),
    due_days: z.string().optional(),
    email: z.string().optional(),
    billing_address: ProviderAddressSchema.optional(),
    shipping_address: ProviderAddressSchema.optional(),
    country: z.string().optional(),
    phone: z.string().optional(),
    created_by: z.string().optional(),
    total: z.number().optional(),
    balance: z.number().optional(),
    payment_expected_date: z.string().optional(),
    custom_fields: z.array(ProviderCustomFieldSchema).optional(),
    tags: z.array(z.unknown()).optional(),
    salesperson_name: z.string().optional(),
    salesperson_id: z.union([z.string(), z.number()]).optional(),
    shipping_charge: z.number().optional(),
    adjustment: z.number().optional(),
    created_time: z.string().optional(),
    last_modified_time: z.string().optional(),
    updated_time: z.string().optional(),
    is_viewed_by_client: z.boolean().optional(),
    has_attachment: z.boolean().optional(),
    client_viewed_time: z.string().optional(),
    is_emailed: z.boolean().optional(),
    color_code: z.string().optional(),
    current_sub_status_id: z.union([z.string(), z.number()]).optional(),
    current_sub_status: z.string().optional(),
    currency_id: z.union([z.string(), z.number()]).optional(),
    schedule_time: z.string().optional(),
    currency_code: z.string().optional(),
    currency_symbol: z.string().optional(),
    template_type: z.string().optional(),
    invoice_source: z.string().optional(),
    sales_channel: z.string().optional(),
    transaction_type: z.string().optional(),
    reminders_sent: z.number().optional(),
    last_reminder_sent_date: z.string().optional(),
    last_payment_date: z.string().optional(),
    template_id: z.union([z.string(), z.number()]).optional(),
    documents: z.string().optional(),
    write_off_amount: z.number().optional(),
    exchange_rate: z.number().optional(),
    unprocessed_payment_amount: z.number().optional(),
    invoice_url: z.string().optional()
});

const CheckpointSchema = z
    .object({
        organization_id: z.string().describe('Organization the interrupted scan belongs to; a checkpoint for another organization is ignored.'),
        last_modified_time: z
            .string()
            .describe('Inclusive last_modified_time cursor to resume the interrupted full refresh from; empty before the first full page.'),
        page: z.number().int().positive().describe('Page within the records sharing the cursor timestamp.')
    })
    .describe('Checkpoint storing the keyset position of an interrupted invoices full refresh.');

const AddressSchema = z
    .object({
        address: z.string().optional().describe('Street address line 1.'),
        street2: z.string().optional().describe('Street address line 2.'),
        city: z.string().optional().describe('City.'),
        state: z.string().optional().describe('State or province.'),
        zipcode: z.string().optional().describe('ZIP or postal code.'),
        country: z.string().optional().describe('Country.'),
        phone: z.string().optional().describe('Phone number.'),
        fax: z.string().optional().describe('Fax number.'),
        attention: z.string().optional().describe('Attention line.')
    })
    .describe('A billing or shipping address on the invoice.');

const CustomFieldSchema = z
    .object({
        customfield_id: z.union([z.string(), z.number()]).optional().describe('ID of the custom field.'),
        label: z.string().optional().describe('Label of the custom field.'),
        value: z.unknown().optional().describe('Value captured for the custom field.'),
        show_on_pdf: z.boolean().optional().describe('Whether the custom field is shown on the invoice PDF.')
    })
    .describe('A custom field configured for the invoice.');

const InvoiceSchema = z
    .object({
        id: z.string().describe('Unique Zoho Inventory invoice ID (invoice_id).'),
        invoice_number: z.string().optional().describe('Human-readable invoice number, e.g. INV-000041.'),
        customer_id: z.string().optional().describe('ID of the customer the invoice was billed to.'),
        customer_name: z.string().optional().describe('Name of the customer the invoice was billed to.'),
        company_name: z.string().optional().describe('Company name associated with the invoice.'),
        status: z.string().optional().describe('Invoice status, e.g. draft, sent, paid, partially_paid, overdue or void.'),
        reference_number: z.string().optional().describe('Optional reference number for the invoice.'),
        date: z.string().optional().describe('Invoice date in yyyy-MM-dd format.'),
        due_date: z.string().optional().describe('Payment due date in yyyy-MM-dd format.'),
        issued_date: z.string().optional().describe('Date the invoice was issued/sent in yyyy-MM-dd format.'),
        due_days: z.string().optional().describe('Human-readable payment terms, e.g. "Due in 14 day(s)".'),
        email: z.string().optional().describe('Email address associated with the invoice customer.'),
        billing_address: AddressSchema.optional().describe('Customer billing address.'),
        shipping_address: AddressSchema.optional().describe('Customer shipping address.'),
        country: z.string().optional().describe('Country of the invoice customer.'),
        phone: z.string().optional().describe('Phone number of the invoice customer.'),
        created_by: z.string().optional().describe('Name of the user who created the invoice.'),
        total: z.number().optional().describe('Total invoice amount including taxes.'),
        balance: z.number().optional().describe('Outstanding balance still due on the invoice.'),
        payment_expected_date: z.string().optional().describe('Expected payment date in yyyy-MM-dd format.'),
        custom_fields: z.array(CustomFieldSchema).optional().describe('Custom fields configured for the invoice.'),
        tags: z.array(z.unknown()).optional().describe('Tags associated with the invoice.'),
        salesperson_name: z.string().optional().describe('Name of the salesperson associated with the invoice.'),
        salesperson_id: z.string().optional().describe('ID of the salesperson associated with the invoice.'),
        shipping_charge: z.number().optional().describe('Shipping charge applied to the invoice.'),
        adjustment: z.number().optional().describe('Manual adjustment applied to the invoice total.'),
        created_time: z.string().optional().describe('Creation timestamp, e.g. 2026-10-09T13:48:53-0400.'),
        last_modified_time: z.string().optional().describe('Last modification timestamp, e.g. 2026-10-09T13:48:53-0400.'),
        updated_time: z.string().optional().describe('Last update timestamp.'),
        is_viewed_by_client: z.boolean().optional().describe('Whether the customer has viewed the invoice.'),
        has_attachment: z.boolean().optional().describe('Whether the invoice has an attachment.'),
        client_viewed_time: z.string().optional().describe('Timestamp when the customer last viewed the invoice.'),
        is_emailed: z.boolean().optional().describe('Whether the invoice has been emailed to the customer.'),
        color_code: z.string().optional().describe('Color code used to highlight the invoice.'),
        current_sub_status_id: z.string().optional().describe('ID of the current workflow sub-status.'),
        current_sub_status: z.string().optional().describe('Current workflow sub-status, e.g. draft, sent, paid or void.'),
        currency_id: z.string().optional().describe('ID of the currency used on the invoice.'),
        schedule_time: z.string().optional().describe('Scheduled send time for the invoice, if any.'),
        currency_code: z.string().optional().describe('ISO currency code, e.g. USD.'),
        currency_symbol: z.string().optional().describe('Currency symbol, e.g. $.'),
        template_type: z.string().optional().describe('Invoice template type, e.g. standard.'),
        invoice_source: z.string().optional().describe('Source through which the invoice was created, e.g. Api.'),
        sales_channel: z.string().optional().describe('Sales channel for the invoice, e.g. direct_sales.'),
        transaction_type: z.string().optional().describe('Transaction type of the invoice, e.g. renewal.'),
        reminders_sent: z.number().optional().describe('Number of payment reminders sent for the invoice.'),
        last_reminder_sent_date: z.string().optional().describe('Date the last payment reminder was sent in yyyy-MM-dd format.'),
        last_payment_date: z.string().optional().describe('Date of the last payment received in yyyy-MM-dd format.'),
        template_id: z.string().optional().describe('ID of the invoice template used.'),
        documents: z.string().optional().describe('Attachment document names associated with the invoice.'),
        write_off_amount: z.number().optional().describe('Amount written off on the invoice.'),
        exchange_rate: z.number().optional().describe('Exchange rate applied to the invoice currency.'),
        unprocessed_payment_amount: z.number().optional().describe('Payment amount received but not yet applied to the invoice.'),
        invoice_url: z.string().optional().describe('Public secure-payment URL for the invoice.'),
        ach_payment_initiated: z.boolean().optional().describe('Whether an ACH payment has been initiated for the invoice.'),
        zcrm_potential_id: z.string().optional().describe('Zoho CRM potential ID linked to the invoice.'),
        zcrm_potential_name: z.string().optional().describe('Zoho CRM potential name linked to the invoice.')
    })
    .describe('A single invoice from Zoho Inventory.');

const asString = (value: string | number | undefined): string | undefined => (value === undefined ? undefined : String(value));

const sync = createSync({
    description: 'Sync all invoices in the organization.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    metadata: OrganizationMetadataSchema,
    scopes: ['ZohoInventory.invoices.READ', 'ZohoInventory.settings.READ'],
    models: {
        Invoice: InvoiceSchema
    },

    exec: async (nango) => {
        const organizationId = await resolveSyncOrganizationId(nango);

        const checkpoint = CheckpointSchema.nullable().parse(await nango.getCheckpoint());
        // A checkpoint left by a scan of another organization (metadata changed mid-scan) does not apply.
        const resume = checkpoint?.organization_id === organizationId ? checkpoint : null;

        // Full refresh: deletions are only detectable by a complete scan. The scan uses a
        // last_modified_time keyset cursor (see paginateByLastModifiedTime) rather than page offsets,
        // so resuming an interrupted scan cannot skip records that trackDeletesEnd would then delete.
        await nango.trackDeletesStart('Invoice');

        const pages = paginateByLastModifiedTime(nango, {
            // https://www.zoho.com/inventory/api/v1/invoices/#list-invoices
            endpoint: '/inventory/v1/invoices',
            responseKey: 'invoices',
            organizationId,
            start: { cursor: resume?.last_modified_time || undefined, page: resume?.page ?? 1 }
        });

        for await (const { records: page, next, done } of pages) {
            const invoices = page.map((rawRecord) => {
                const record = ProviderInvoiceSchema.parse(rawRecord);

                return {
                    id: String(record.invoice_id),
                    invoice_number: record.invoice_number,
                    customer_id: asString(record.customer_id),
                    customer_name: record.customer_name,
                    company_name: record.company_name,
                    status: record.status,
                    reference_number: record.reference_number,
                    date: record.date,
                    due_date: record.due_date,
                    issued_date: record.issued_date,
                    due_days: record.due_days,
                    email: record.email,
                    billing_address: record.billing_address,
                    shipping_address: record.shipping_address,
                    country: record.country,
                    phone: record.phone,
                    created_by: record.created_by,
                    total: record.total,
                    balance: record.balance,
                    payment_expected_date: record.payment_expected_date,
                    custom_fields: record.custom_fields,
                    tags: record.tags,
                    salesperson_name: record.salesperson_name,
                    salesperson_id: asString(record.salesperson_id),
                    shipping_charge: record.shipping_charge,
                    adjustment: record.adjustment,
                    created_time: record.created_time,
                    last_modified_time: record.last_modified_time,
                    updated_time: record.updated_time,
                    is_viewed_by_client: record.is_viewed_by_client,
                    has_attachment: record.has_attachment,
                    client_viewed_time: record.client_viewed_time,
                    is_emailed: record.is_emailed,
                    color_code: record.color_code,
                    current_sub_status_id: asString(record.current_sub_status_id),
                    current_sub_status: record.current_sub_status,
                    currency_id: asString(record.currency_id),
                    schedule_time: record.schedule_time,
                    currency_code: record.currency_code,
                    currency_symbol: record.currency_symbol,
                    template_type: record.template_type,
                    invoice_source: record.invoice_source,
                    sales_channel: record.sales_channel,
                    transaction_type: record.transaction_type,
                    reminders_sent: record.reminders_sent,
                    last_reminder_sent_date: record.last_reminder_sent_date,
                    last_payment_date: record.last_payment_date,
                    template_id: asString(record.template_id),
                    documents: record.documents,
                    write_off_amount: record.write_off_amount,
                    exchange_rate: record.exchange_rate,
                    unprocessed_payment_amount: record.unprocessed_payment_amount,
                    invoice_url: record.invoice_url,
                    ach_payment_initiated: record.ach_payment_initiated,
                    zcrm_potential_id: asString(record.zcrm_potential_id),
                    zcrm_potential_name: record.zcrm_potential_name
                };
            });

            if (invoices.length > 0) {
                await nango.batchSave(invoices, 'Invoice');
            }

            if (!done) {
                await nango.saveCheckpoint({ organization_id: organizationId, last_modified_time: next.cursor ?? '', page: next.page });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Invoice');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
