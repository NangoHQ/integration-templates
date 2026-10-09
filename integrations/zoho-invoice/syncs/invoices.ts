import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const AddressSchema = z
    .object({
        address: z.string().optional().describe('First line of the street address'),
        street2: z.string().optional().describe('Second line of the street address'),
        city: z.string().optional().describe('City of the address'),
        state: z.string().optional().describe('State or province of the address'),
        zipcode: z.string().optional().describe('ZIP or postal code of the address'),
        country: z.string().optional().describe('Country of the address'),
        phone: z.string().optional().describe('Phone number associated with the address'),
        fax: z.string().optional().describe('Fax number associated with the address'),
        attention: z.string().optional().describe('Person or department the address is addressed to')
    })
    .describe('Billing or shipping address associated with the invoice');

const CustomFieldSchema = z
    .object({
        customfield_id: z.string().optional().describe('Unique identifier of the invoice custom field'),
        label: z.string().optional().describe('Display label of the invoice custom field'),
        value: z.unknown().optional().describe('Value stored in the invoice custom field')
    })
    .describe('A custom field configured on the invoice');

const InvoiceSchema = z
    .object({
        id: z.string().describe('Unique Zoho Invoice identifier for the invoice'),
        invoice_number: z.string().optional().describe('Sequential invoice number assigned by Zoho Invoice'),
        status: z.string().optional().describe('Invoice status: draft, sent, viewed, unpaid, partially_paid, paid, overdue or void'),
        current_sub_status: z.string().optional().describe('Secondary status label shown for the invoice'),
        current_sub_status_id: z.string().optional().describe('Identifier of the invoice secondary status'),
        customer_id: z.string().optional().describe('Unique identifier of the customer the invoice was billed to'),
        customer_name: z.string().optional().describe('Display name of the customer the invoice was billed to'),
        company_name: z.string().optional().describe('Company name of the customer'),
        email: z.string().optional().describe('Email address associated with the invoice'),
        reference_number: z.string().optional().describe('Free-form reference number for the invoice'),
        date: z.string().optional().describe('Invoice date in yyyy-mm-dd format'),
        due_date: z.string().optional().describe('Invoice due date in yyyy-mm-dd format'),
        issued_date: z.string().optional().describe('Date the invoice was issued'),
        due_days: z.string().optional().describe('Number of days until the invoice is due'),
        payment_expected_date: z.string().optional().describe('Expected payment date for the invoice'),
        last_payment_date: z.string().optional().describe('Date of the last payment recorded against the invoice'),
        currency_id: z.string().optional().describe('Unique identifier of the invoice currency'),
        currency_code: z.string().optional().describe('ISO 4217 currency code of the invoice'),
        currency_symbol: z.string().optional().describe('Currency symbol displayed on the invoice'),
        exchange_rate: z.number().optional().describe('Exchange rate applied to the invoice currency'),
        total: z.number().optional().describe('Total amount of the invoice including taxes and adjustments'),
        balance: z.number().optional().describe('Outstanding amount still due on the invoice'),
        write_off_amount: z.number().optional().describe('Amount written off as uncollectible for the invoice'),
        unprocessed_payment_amount: z.number().optional().describe('Payment amount received but not yet applied to the invoice'),
        shipping_charge: z.number().optional().describe('Shipping charge added to the invoice'),
        adjustment: z.number().optional().describe('Manual adjustment applied to the invoice total'),
        is_viewed_by_client: z.boolean().optional().describe('Whether the customer has viewed the invoice'),
        has_attachment: z.boolean().optional().describe('Whether the invoice has one or more attachments'),
        is_emailed: z.boolean().optional().describe('Whether the invoice has been emailed to the customer'),
        is_viewed_in_mail: z.boolean().optional().describe('Whether the invoice email was viewed'),
        client_viewed_time: z.string().optional().describe('Timestamp when the customer viewed the invoice'),
        mail_first_viewed_time: z.string().optional().describe('Timestamp when the invoice email was first viewed'),
        mail_last_viewed_time: z.string().optional().describe('Timestamp when the invoice email was last viewed'),
        reminders_sent: z.number().optional().describe('Number of payment reminders sent for the invoice'),
        last_reminder_sent_date: z.string().optional().describe('Date the last payment reminder was sent'),
        created_time: z.string().optional().describe('Timestamp when the invoice was created, with timezone offset'),
        last_modified_time: z.string().optional().describe('Timestamp when the invoice was last modified, with timezone offset'),
        updated_time: z.string().optional().describe('Timestamp when the invoice was last updated, with timezone offset'),
        created_by: z.string().optional().describe('Name of the user who created the invoice'),
        invoice_source: z.string().optional().describe('Source through which the invoice was created'),
        sales_channel: z.string().optional().describe('Sales channel associated with the invoice'),
        transaction_type: z.string().optional().describe('Transaction type of the invoice'),
        template_id: z.string().optional().describe('Identifier of the PDF template used for the invoice'),
        template_type: z.string().optional().describe('Layout type of the invoice template'),
        salesperson_id: z.string().optional().describe('Identifier of the salesperson linked to the invoice'),
        salesperson_name: z.string().optional().describe('Name of the salesperson linked to the invoice'),
        project_name: z.string().optional().describe('Name of the project associated with the invoice'),
        country: z.string().optional().describe('Country of the customer billing address'),
        phone: z.string().optional().describe('Phone number of the customer'),
        color_code: z.string().optional().describe('Color code associated with the invoice status'),
        schedule_time: z.string().optional().describe('Scheduled time associated with the invoice'),
        documents: z.string().optional().describe('Documents attached to the invoice'),
        invoice_url: z.string().optional().describe('Shareable URL of the invoice in the customer portal'),
        ach_payment_initiated: z.boolean().optional().describe('Whether an ACH payment has been initiated for the invoice'),
        zcrm_potential_id: z.string().optional().describe('Identifier of the linked Zoho CRM deal, when applicable'),
        zcrm_potential_name: z.string().optional().describe('Name of the linked Zoho CRM deal, when applicable'),
        billing_address: AddressSchema.optional().describe('Billing address recorded on the invoice'),
        shipping_address: AddressSchema.optional().describe('Shipping address recorded on the invoice'),
        custom_fields: z.array(CustomFieldSchema).optional().describe('Custom fields configured on the invoice'),
        custom_field_hash: z.record(z.string(), z.unknown()).optional().describe('Map of custom field API names to their values')
    })
    .describe('A Zoho Invoice invoice, including its status, totals and outstanding balance');

const CheckpointSchema = z
    .object({
        updated_after: z.string().describe('last_modified_time filter value for the scan in progress; empty on the first run'),
        page: z.number().int().positive().describe('1-based page number to resume an interrupted scan from')
    })
    .describe('Incremental checkpoint for the invoices sync');

const MetadataSchema = z
    .object({
        organization_id: z.string().describe('Zoho Invoice organization identifier required by every invoices endpoint')
    })
    .describe('Connection metadata required to call the Zoho Invoice API');

const RawInvoiceSchema = z.object({
    invoice_id: z.union([z.string(), z.number()]),
    invoice_number: z.string().optional(),
    status: z.string().optional(),
    current_sub_status: z.string().optional(),
    current_sub_status_id: z.string().optional(),
    customer_id: z.union([z.string(), z.number()]).optional(),
    customer_name: z.string().optional(),
    company_name: z.string().optional(),
    email: z.string().optional(),
    reference_number: z.string().optional(),
    date: z.string().optional(),
    due_date: z.string().optional(),
    issued_date: z.string().optional(),
    due_days: z.string().optional(),
    payment_expected_date: z.string().optional(),
    last_payment_date: z.string().optional(),
    currency_id: z.union([z.string(), z.number()]).optional(),
    currency_code: z.string().optional(),
    currency_symbol: z.string().optional(),
    exchange_rate: z.number().optional(),
    total: z.number().optional(),
    balance: z.number().optional(),
    write_off_amount: z.number().optional(),
    unprocessed_payment_amount: z.number().optional(),
    shipping_charge: z.number().optional(),
    adjustment: z.number().optional(),
    is_viewed_by_client: z.boolean().optional(),
    has_attachment: z.boolean().optional(),
    is_emailed: z.boolean().optional(),
    is_viewed_in_mail: z.boolean().optional(),
    client_viewed_time: z.string().optional(),
    mail_first_viewed_time: z.string().optional(),
    mail_last_viewed_time: z.string().optional(),
    reminders_sent: z.number().optional(),
    last_reminder_sent_date: z.string().optional(),
    created_time: z.string().optional(),
    last_modified_time: z.string().optional(),
    updated_time: z.string().optional(),
    created_by: z.string().optional(),
    invoice_source: z.string().optional(),
    sales_channel: z.string().optional(),
    transaction_type: z.string().optional(),
    template_id: z.union([z.string(), z.number()]).optional(),
    template_type: z.string().optional(),
    salesperson_id: z.union([z.string(), z.number()]).optional(),
    salesperson_name: z.string().optional(),
    project_name: z.string().optional(),
    country: z.string().optional(),
    phone: z.string().optional(),
    color_code: z.string().optional(),
    schedule_time: z.string().optional(),
    documents: z.string().optional(),
    invoice_url: z.string().optional(),
    ach_payment_initiated: z.boolean().optional(),
    zcrm_potential_id: z.string().optional(),
    zcrm_potential_name: z.string().optional(),
    billing_address: AddressSchema.optional(),
    shipping_address: AddressSchema.optional(),
    custom_fields: z.array(CustomFieldSchema).optional(),
    custom_field_hash: z.record(z.string(), z.unknown()).optional()
});

function laterTimestamp(current: string | undefined, candidate: string | undefined): string | undefined {
    if (candidate == null) {
        return current;
    }
    if (current == null) {
        return candidate;
    }

    const currentMs = Date.parse(current);
    const candidateMs = Date.parse(candidate);
    if (Number.isNaN(currentMs)) {
        return candidate;
    }
    if (Number.isNaN(candidateMs)) {
        return current;
    }

    return candidateMs > currentMs ? candidate : current;
}

const sync = createSync({
    description: 'Sync all invoices from Zoho Invoice, incrementally by last modified time.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        Invoice: InvoiceSchema
    },

    exec: async (nango) => {
        const metadata = MetadataSchema.parse(await nango.getMetadata());
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : { updated_after: '', page: 1 };
        const updatedAfter = checkpoint.updated_after !== '' ? checkpoint.updated_after : undefined;
        let page: number | undefined = checkpoint.page;
        let maxUpdatedAfter = updatedAfter;

        const params: Record<string, string | number> = {
            organization_id: metadata.organization_id,
            sort_column: 'last_modified_time',
            sort_order: 'A'
        };
        if (updatedAfter !== undefined) {
            params['last_modified_time'] = updatedAfter;
        }

        const proxyConfig: ProxyConfiguration = {
            // https://www.zoho.com/invoice/api/v3/invoices/#list-invoices
            endpoint: '/invoice/v3/invoices',
            params,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: page ?? 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 200,
                response_path: 'invoices',
                on_page: async ({ nextPageParam }) => {
                    page = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const pageResults of nango.paginate<unknown>(proxyConfig)) {
            const invoices = pageResults.map((item) => {
                const parsed = RawInvoiceSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse invoice: ${parsed.error.message}`);
                }
                const record = parsed.data;
                return {
                    id: String(record.invoice_id),
                    ...(record.invoice_number != null && { invoice_number: record.invoice_number }),
                    ...(record.status != null && { status: record.status }),
                    ...(record.current_sub_status != null && { current_sub_status: record.current_sub_status }),
                    ...(record.current_sub_status_id != null && { current_sub_status_id: record.current_sub_status_id }),
                    ...(record.customer_id != null && { customer_id: String(record.customer_id) }),
                    ...(record.customer_name != null && { customer_name: record.customer_name }),
                    ...(record.company_name != null && { company_name: record.company_name }),
                    ...(record.email != null && { email: record.email }),
                    ...(record.reference_number != null && { reference_number: record.reference_number }),
                    ...(record.date != null && { date: record.date }),
                    ...(record.due_date != null && { due_date: record.due_date }),
                    ...(record.issued_date != null && { issued_date: record.issued_date }),
                    ...(record.due_days != null && { due_days: record.due_days }),
                    ...(record.payment_expected_date != null && { payment_expected_date: record.payment_expected_date }),
                    ...(record.last_payment_date != null && { last_payment_date: record.last_payment_date }),
                    ...(record.currency_id != null && { currency_id: String(record.currency_id) }),
                    ...(record.currency_code != null && { currency_code: record.currency_code }),
                    ...(record.currency_symbol != null && { currency_symbol: record.currency_symbol }),
                    ...(record.exchange_rate != null && { exchange_rate: record.exchange_rate }),
                    ...(record.total != null && { total: record.total }),
                    ...(record.balance != null && { balance: record.balance }),
                    ...(record.write_off_amount != null && { write_off_amount: record.write_off_amount }),
                    ...(record.unprocessed_payment_amount != null && { unprocessed_payment_amount: record.unprocessed_payment_amount }),
                    ...(record.shipping_charge != null && { shipping_charge: record.shipping_charge }),
                    ...(record.adjustment != null && { adjustment: record.adjustment }),
                    ...(record.is_viewed_by_client != null && { is_viewed_by_client: record.is_viewed_by_client }),
                    ...(record.has_attachment != null && { has_attachment: record.has_attachment }),
                    ...(record.is_emailed != null && { is_emailed: record.is_emailed }),
                    ...(record.is_viewed_in_mail != null && { is_viewed_in_mail: record.is_viewed_in_mail }),
                    ...(record.client_viewed_time != null && { client_viewed_time: record.client_viewed_time }),
                    ...(record.mail_first_viewed_time != null && { mail_first_viewed_time: record.mail_first_viewed_time }),
                    ...(record.mail_last_viewed_time != null && { mail_last_viewed_time: record.mail_last_viewed_time }),
                    ...(record.reminders_sent != null && { reminders_sent: record.reminders_sent }),
                    ...(record.last_reminder_sent_date != null && { last_reminder_sent_date: record.last_reminder_sent_date }),
                    ...(record.created_time != null && { created_time: record.created_time }),
                    ...(record.last_modified_time != null && { last_modified_time: record.last_modified_time }),
                    ...(record.updated_time != null && { updated_time: record.updated_time }),
                    ...(record.created_by != null && { created_by: record.created_by }),
                    ...(record.invoice_source != null && { invoice_source: record.invoice_source }),
                    ...(record.sales_channel != null && { sales_channel: record.sales_channel }),
                    ...(record.transaction_type != null && { transaction_type: record.transaction_type }),
                    ...(record.template_id != null && { template_id: String(record.template_id) }),
                    ...(record.template_type != null && { template_type: record.template_type }),
                    ...(record.salesperson_id != null && { salesperson_id: String(record.salesperson_id) }),
                    ...(record.salesperson_name != null && { salesperson_name: record.salesperson_name }),
                    ...(record.project_name != null && { project_name: record.project_name }),
                    ...(record.country != null && { country: record.country }),
                    ...(record.phone != null && { phone: record.phone }),
                    ...(record.color_code != null && { color_code: record.color_code }),
                    ...(record.schedule_time != null && { schedule_time: record.schedule_time }),
                    ...(record.documents != null && { documents: record.documents }),
                    ...(record.invoice_url != null && { invoice_url: record.invoice_url }),
                    ...(record.ach_payment_initiated != null && { ach_payment_initiated: record.ach_payment_initiated }),
                    ...(record.zcrm_potential_id != null && { zcrm_potential_id: record.zcrm_potential_id }),
                    ...(record.zcrm_potential_name != null && { zcrm_potential_name: record.zcrm_potential_name }),
                    ...(record.billing_address != null && { billing_address: record.billing_address }),
                    ...(record.shipping_address != null && { shipping_address: record.shipping_address }),
                    ...(record.custom_fields != null && { custom_fields: record.custom_fields }),
                    ...(record.custom_field_hash != null && { custom_field_hash: record.custom_field_hash })
                };
            });

            if (invoices.length > 0) {
                await nango.batchSave(invoices, 'Invoice');

                for (const invoice of invoices) {
                    maxUpdatedAfter = laterTimestamp(maxUpdatedAfter, invoice.last_modified_time);
                }
            }

            // Keep the original filter while this paginated scan is in flight. Once the full
            // window succeeds, replace it with the newest last_modified_time observed.
            if (page !== undefined) {
                await nango.saveCheckpoint({ updated_after: updatedAfter ?? '', page });
            }
        }

        await nango.saveCheckpoint({
            updated_after: maxUpdatedAfter ?? updatedAfter ?? '',
            page: 1
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
