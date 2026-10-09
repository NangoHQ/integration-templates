import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MetadataSchema = z
    .object({
        organization_id: z
            .string()
            .describe(
                'Zoho Invoice organization ID to sync customer payments for. Required because this connection cannot list organizations (its scope grant excludes ZohoInvoice.settings.READ); set it from the Zoho Invoice UI or from a settings-capable connection.'
            )
    })
    .describe('Connection metadata required to sync Zoho Invoice customer payments.');

const CheckpointSchema = z
    .object({
        updated_after: z
            .string()
            .describe(
                'ISO-8601 last_modified_time of the most recent customer payment processed; used as the incremental filter. Empty string means no filter yet.'
            ),
        page: z.number().int().positive().describe('Page number to resume from when a previous execution stopped part-way through pagination.')
    })
    .describe('Incremental sync progress for Zoho Invoice customer payments.');

const CheckDetailsSchema = z
    .object({
        check_id: z.string().optional().describe('Unique ID of the associated check, when the payment was made by check.'),
        check_status: z.string().optional().describe('Current status of the associated check (for example "cleared" or "not_cleared").'),
        check_number: z.string().optional().describe('Check number printed on the associated check.'),
        memo: z.string().optional().describe('Memo recorded on the associated check.'),
        expiry_date: z.string().optional().describe('Expiry date of the associated check (YYYY-MM-DD).')
    })
    .describe('Check-specific details for a customer payment made by check.');

const AppliedInvoiceSchema = z
    .object({
        invoice_id: z.string().optional().describe('ID of the invoice this payment was applied to.'),
        invoice_number: z.string().optional().describe('Display number of the applied invoice (for example "INV-000011").'),
        date: z.string().optional().describe('Date the applied invoice was raised (YYYY-MM-DD).'),
        invoice_amount: z.number().optional().describe('Total amount of the applied invoice.'),
        amount_applied: z.number().optional().describe('Amount of this payment applied to the invoice.'),
        balance_amount: z.number().optional().describe('Unpaid balance of the applied invoice after this payment was applied.')
    })
    .describe('An invoice that a customer payment has been applied to.');

const CustomerPaymentSchema = z
    .object({
        id: z.string().describe('Unique Zoho Invoice customer payment ID (payment_id).'),
        payment_number: z.string().optional().describe('Sequential payment number shown in the Zoho Invoice UI.'),
        invoice_numbers: z.string().optional().describe('Comma-separated list of invoice numbers this payment is associated with.'),
        date: z.string().optional().describe('Date the payment was recorded (YYYY-MM-DD).'),
        payment_mode: z.string().optional().describe('Machine-readable payment mode (for example "cash", "check", "banktransfer").'),
        payment_mode_formatted: z.string().optional().describe('Human-readable label for the payment mode.'),
        amount: z.number().optional().describe('Payment amount in the payment currency.'),
        bcy_amount: z.number().optional().describe('Payment amount in the organization base currency.'),
        unused_amount: z.number().optional().describe('Portion of the payment not yet applied to any invoice, in the payment currency.'),
        bcy_unused_amount: z.number().optional().describe('Portion of the payment not yet applied to any invoice, in the base currency.'),
        description: z.string().optional().describe('Free-text description or note recorded against the payment.'),
        reference_number: z.string().optional().describe('Reference number recorded against the payment.'),
        is_paid_via_check: z.boolean().optional().describe('Whether the payment was made by check.'),
        check_details: CheckDetailsSchema.optional().describe('Check-specific details for check payments.'),
        customer_id: z.string().optional().describe('ID of the customer (contact) the payment belongs to.'),
        customer_name: z.string().optional().describe('Display name of the customer the payment belongs to.'),
        created_time: z.string().optional().describe('ISO-8601 timestamp when the payment was created.'),
        last_modified_time: z.string().optional().describe('ISO-8601 timestamp when the payment was last modified; the incremental sync cursor.'),
        last_four_digits: z.string().optional().describe('Last four digits of the card used for the payment, when applicable.'),
        gateway_transaction_id: z.string().optional().describe('Transaction ID returned by the payment gateway, when applicable.'),
        payment_gateway: z.string().optional().describe('Name of the payment gateway used for the payment, when applicable.'),
        bcy_refunded_amount: z.number().optional().describe('Amount of this payment that has been refunded, in the base currency.'),
        applied_invoices: z.array(AppliedInvoiceSchema).optional().describe('Invoices this payment has been applied to.'),
        has_attachment: z.boolean().optional().describe('Whether the payment has an attachment.'),
        documents: z.string().optional().describe('Attached document reference for the payment.'),
        custom_fields_list: z.string().optional().describe('Serialized custom field values for the payment.'),
        tax_amount_withheld: z.number().optional().describe('Tax amount withheld from the payment, when withholding tax applies.'),
        payment_type: z.string().optional().describe('Type of the payment (for example "Invoice Payment").'),
        payment_status: z.string().optional().describe('Status of the payment (for example "paid").'),
        settlement_status: z.string().optional().describe('Settlement status reported by the provider, when available.'),
        sales_channel: z.string().optional().describe('Sales channel the payment was recorded through.')
    })
    .describe('A customer payment received in Zoho Invoice.');

const ProviderCheckDetailsSchema = z.object({
    check_id: z.string().optional(),
    check_status: z.string().optional(),
    check_number: z.string().optional(),
    memo: z.string().optional(),
    expiry_date: z.string().optional()
});

const ProviderAppliedInvoiceSchema = z.object({
    invoice_id: z.string().optional(),
    invoice_number: z.string().optional(),
    date: z.string().optional(),
    invoice_amount: z.number().optional(),
    amount_applied: z.number().optional(),
    balance_amount: z.number().optional()
});

const ProviderCustomerPaymentSchema = z.object({
    payment_id: z.string(),
    payment_number: z.string().optional(),
    invoice_numbers: z.string().optional(),
    date: z.string().optional(),
    payment_mode: z.string().optional(),
    payment_mode_formatted: z.string().optional(),
    amount: z.number().optional(),
    bcy_amount: z.number().optional(),
    unused_amount: z.number().optional(),
    bcy_unused_amount: z.number().optional(),
    description: z.string().optional(),
    reference_number: z.string().optional(),
    is_paid_via_check: z.boolean().optional(),
    check_details: ProviderCheckDetailsSchema.nullable().optional(),
    customer_id: z.string().optional(),
    customer_name: z.string().optional(),
    created_time: z.string().optional(),
    last_modified_time: z.string(),
    last_four_digits: z.string().optional(),
    gateway_transaction_id: z.string().optional(),
    payment_gateway: z.string().optional(),
    bcy_refunded_amount: z.number().optional(),
    applied_invoices: z.array(ProviderAppliedInvoiceSchema).nullable().optional(),
    has_attachment: z.boolean().optional(),
    documents: z.string().optional(),
    custom_fields_list: z.string().optional(),
    tax_amount_withheld: z.number().optional(),
    payment_type: z.string().optional(),
    payment_status: z.string().optional(),
    settlement_status: z.string().optional(),
    sales_channel: z.string().optional()
});

function toCustomerPayment(payment: z.infer<typeof ProviderCustomerPaymentSchema>): z.infer<typeof CustomerPaymentSchema> {
    return {
        id: payment.payment_id,
        payment_number: payment.payment_number,
        invoice_numbers: payment.invoice_numbers,
        date: payment.date,
        payment_mode: payment.payment_mode,
        payment_mode_formatted: payment.payment_mode_formatted,
        amount: payment.amount,
        bcy_amount: payment.bcy_amount,
        unused_amount: payment.unused_amount,
        bcy_unused_amount: payment.bcy_unused_amount,
        description: payment.description,
        reference_number: payment.reference_number,
        is_paid_via_check: payment.is_paid_via_check,
        check_details: payment.check_details ?? undefined,
        customer_id: payment.customer_id,
        customer_name: payment.customer_name,
        created_time: payment.created_time,
        last_modified_time: payment.last_modified_time,
        last_four_digits: payment.last_four_digits,
        gateway_transaction_id: payment.gateway_transaction_id,
        payment_gateway: payment.payment_gateway,
        bcy_refunded_amount: payment.bcy_refunded_amount,
        applied_invoices:
            payment.applied_invoices?.map((invoice) => ({
                invoice_id: invoice.invoice_id,
                invoice_number: invoice.invoice_number,
                date: invoice.date,
                invoice_amount: invoice.invoice_amount,
                amount_applied: invoice.amount_applied,
                balance_amount: invoice.balance_amount
            })) ?? undefined,
        has_attachment: payment.has_attachment,
        documents: payment.documents,
        custom_fields_list: payment.custom_fields_list,
        tax_amount_withheld: payment.tax_amount_withheld,
        payment_type: payment.payment_type,
        payment_status: payment.payment_status,
        settlement_status: payment.settlement_status,
        sales_channel: payment.sales_channel
    };
}

function laterTimestamp(current: string | undefined, candidate: string): string {
    if (current === undefined) {
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
    description: 'Sync customer payments from Zoho Invoice, incrementally by last_modified_time.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        CustomerPayment: CustomerPaymentSchema
    },

    exec: async (nango) => {
        const metadata = await nango.getMetadata<z.infer<typeof MetadataSchema>>();

        if (!metadata?.organization_id) {
            throw new Error('organization_id is required in the connection metadata to sync Zoho Invoice customer payments.');
        }

        const checkpoint = await nango.getCheckpoint();
        const updatedAfter = checkpoint?.updated_after ? checkpoint.updated_after : undefined;
        let currentPage = checkpoint?.page ?? 1;
        let maxLastModifiedTime: string | undefined;

        const proxyConfig: ProxyConfiguration = {
            // https://www.zoho.com/invoice/api/v3/customerpayments/
            endpoint: '/invoice/v3/customerpayments',
            params: {
                organization_id: metadata.organization_id,
                ...(updatedAfter ? { last_modified_time: updatedAfter } : {})
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: currentPage,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 200,
                response_path: 'customerpayments'
            },
            retries: 3
        };

        for await (const rawPayments of nango.paginate<unknown>(proxyConfig)) {
            const payments = z.array(ProviderCustomerPaymentSchema).parse(rawPayments);

            if (payments.length > 0) {
                await nango.batchSave(payments.map(toCustomerPayment), 'CustomerPayment');
            }

            for (const payment of payments) {
                maxLastModifiedTime = laterTimestamp(maxLastModifiedTime, payment.last_modified_time);
            }

            await nango.saveCheckpoint({
                updated_after: updatedAfter ?? '',
                page: currentPage
            });
            currentPage += 1;
        }

        if (maxLastModifiedTime !== undefined) {
            await nango.saveCheckpoint({ updated_after: maxLastModifiedTime, page: 1 });
        } else if (updatedAfter !== undefined) {
            await nango.saveCheckpoint({ updated_after: updatedAfter, page: 1 });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
