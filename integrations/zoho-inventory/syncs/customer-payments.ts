import { createSync } from 'nango';
import { z } from 'zod';

import { OrganizationMetadataSchema, resolveSyncOrganizationId } from '../helpers/organization.js';
import { paginateByLastModifiedTime } from '../helpers/pagination.js';

const CheckDetailsSchema = z.object({
    check_id: z.string().describe('Unique identifier of the check, when the payment was received by check. Empty when the payment was not made by check.'),
    check_status: z.string().describe('Current processing status of the check. Empty when the payment was not made by check.'),
    check_number: z.string().describe('Check number associated with the payment. Empty when the payment was not made by check.'),
    memo: z.string().describe('Memo recorded on the check. Empty when the payment was not made by check.'),
    expiry_date: z.string().describe('Expiry date of the check in YYYY-MM-DD format. Empty when the payment was not made by check.'),
    clearance_account_id: z.string().describe('Identifier of the account the check clears into. Empty when the payment was not made by check.')
});

const AppliedInvoiceSchema = z.object({
    invoice_id: z.string().describe('Unique identifier of the invoice this payment was applied to.'),
    invoice_number: z.string().describe('Display number of the invoice this payment was applied to.'),
    invoice_payment_id: z.string().describe('Identifier of the payment-to-invoice association.'),
    amount_applied: z.number().describe('Amount of this payment that was applied to the invoice.'),
    total: z.number().describe('Total amount of the invoice the payment was applied to.'),
    balance: z.number().describe('Outstanding balance of the invoice after this payment was applied.'),
    date: z.string().describe('Invoice date in YYYY-MM-DD format.'),
    due_date: z.string().describe('Invoice due date in YYYY-MM-DD format.')
});

const TagSchema = z.object({
    tag_id: z.string().describe('Unique identifier of the tag.'),
    tag_name: z.string().describe('Display name of the tag.')
});

const CustomerPaymentSchema = z
    .object({
        id: z.string().describe('Unique identifier of the customer payment (Zoho payment_id), used as the sync record id.'),
        payment_number: z.string().describe('Auto-generated payment number for the payment.'),
        invoice_numbers: z.string().describe('Comma-separated list of invoice numbers this payment has been applied to.'),
        date: z.string().describe('Date the payment was recorded, in YYYY-MM-DD format.'),
        payment_mode: z.string().describe('Payment method key, for example "cash", "check", "banktransfer" or "creditcard".'),
        payment_mode_formatted: z.string().describe('Human-readable label for the payment method.'),
        amount: z.number().describe('Payment amount in the organization currency.'),
        bcy_amount: z.number().describe('Payment amount in the organization base currency.'),
        unused_amount: z.number().describe('Portion of the payment not yet applied to any invoice.'),
        bcy_unused_amount: z.number().describe('Portion of the payment not yet applied to any invoice, in the organization base currency.'),
        account_id: z.string().describe('Identifier of the account the payment was deposited into.'),
        account_name: z.string().describe('Display name of the account the payment was deposited into.'),
        description: z.string().describe('Optional description recorded on the payment.'),
        reference_number: z.string().describe('Optional external reference number for the payment.'),
        is_paid_via_check: z.boolean().describe('Whether the payment was paid using a check.'),
        check_details: CheckDetailsSchema.describe('Check-related details for the payment. Fields are empty when the payment was not made by check.'),
        customer_id: z.string().describe('Identifier of the customer the payment was received from.'),
        customer_name: z.string().describe('Display name of the customer the payment was received from.'),
        created_time: z.string().describe('Timestamp when the payment was created, in ISO 8601 format with a numeric UTC offset.'),
        last_modified_time: z.string().describe('Timestamp when the payment was last modified, in ISO 8601 format with a numeric UTC offset.'),
        last_four_digits: z.string().describe('Last four digits of the card used for the payment. Empty for non-card payments.'),
        gateway_transaction_id: z.string().describe('Transaction identifier from the payment gateway. Empty for offline payments.'),
        payment_gateway: z.string().describe('Name of the payment gateway used. Empty for offline payments.'),
        bcy_refunded_amount: z.number().describe('Amount refunded from this payment, in the organization base currency.'),
        applied_invoices: z.array(AppliedInvoiceSchema).describe('Invoices this payment has been applied to, with the amount applied to each.'),
        has_attachment: z.boolean().describe('Whether the payment has an attachment.'),
        tags: z.array(TagSchema).describe('Tags associated with the payment.'),
        documents: z.string().describe('Documents attached to the payment. Empty string when there are none.'),
        custom_fields_list: z.string().describe('Custom field values for the payment. Empty string when there are none.'),
        tax_account_id: z.string().describe('Identifier of the tax account associated with the payment. Empty when no tax was withheld.'),
        tax_account_name: z.string().describe('Display name of the tax account associated with the payment. Empty when no tax was withheld.'),
        tax_amount_withheld: z.number().describe('Tax amount withheld from the payment.'),
        payment_type: z.string().describe('Type of the payment, for example "Invoice Payment" or "Advance Payment".'),
        payment_status: z.string().describe('Current status of the payment, for example "paid" or "partially_paid".'),
        settlement_status: z.string().describe('Settlement status of the payment. Empty when the payment is not settled through a gateway.'),
        sales_channel: z.string().describe('Sales channel the payment was received through. Empty when not set.')
    })
    .describe('A customer payment recorded against one or more invoices in Zoho Inventory.');

const CheckpointSchema = z
    .object({
        organization_id: z.string().describe('Organization the interrupted scan belongs to; a checkpoint for another organization is ignored.'),
        last_modified_time: z
            .string()
            .describe('Inclusive last_modified_time cursor to resume the interrupted full refresh from; empty before the first full page.'),
        page: z.number().int().positive().describe('Page within the records sharing the cursor timestamp.')
    })
    .describe('Checkpoint storing the keyset position of an interrupted customer payments full refresh.');

const ProviderCheckDetailsSchema = z.object({
    check_id: z.string().nullish(),
    check_status: z.string().nullish(),
    check_number: z.string().nullish(),
    memo: z.string().nullish(),
    expiry_date: z.string().nullish(),
    clearance_account_id: z.string().nullish()
});

const ProviderAppliedInvoiceSchema = z.object({
    invoice_id: z.string().nullish(),
    invoice_number: z.string().nullish(),
    invoice_payment_id: z.string().nullish(),
    amount_applied: z.number().nullish(),
    total: z.number().nullish(),
    balance: z.number().nullish(),
    date: z.string().nullish(),
    due_date: z.string().nullish()
});

const ProviderTagSchema = z.object({
    tag_id: z.string().nullish(),
    tag_name: z.string().nullish()
});

const ProviderCustomerPaymentSchema = z.object({
    payment_id: z.string(),
    payment_number: z.string().nullish(),
    invoice_numbers: z.string().nullish(),
    date: z.string().nullish(),
    payment_mode: z.string().nullish(),
    payment_mode_formatted: z.string().nullish(),
    amount: z.number().nullish(),
    bcy_amount: z.number().nullish(),
    unused_amount: z.number().nullish(),
    bcy_unused_amount: z.number().nullish(),
    account_id: z.string().nullish(),
    account_name: z.string().nullish(),
    description: z.string().nullish(),
    reference_number: z.string().nullish(),
    is_paid_via_check: z.boolean().nullish(),
    check_details: ProviderCheckDetailsSchema.nullish(),
    customer_id: z.string().nullish(),
    customer_name: z.string().nullish(),
    created_time: z.string().nullish(),
    last_modified_time: z.string().nullish(),
    last_four_digits: z.string().nullish(),
    gateway_transaction_id: z.string().nullish(),
    payment_gateway: z.string().nullish(),
    bcy_refunded_amount: z.number().nullish(),
    applied_invoices: z.array(ProviderAppliedInvoiceSchema).nullish(),
    has_attachment: z.boolean().nullish(),
    tags: z.array(ProviderTagSchema).nullish(),
    documents: z.string().nullish(),
    custom_fields_list: z.string().nullish(),
    tax_account_id: z.string().nullish(),
    tax_account_name: z.string().nullish(),
    tax_amount_withheld: z.number().nullish(),
    payment_type: z.string().nullish(),
    payment_status: z.string().nullish(),
    settlement_status: z.string().nullish(),
    sales_channel: z.string().nullish()
});

const sync = createSync({
    description: 'Sync all recorded customer payments in the organization.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    metadata: OrganizationMetadataSchema,
    scopes: ['ZohoInventory.customerpayments.READ', 'ZohoInventory.settings.READ'],
    models: {
        CustomerPayment: CustomerPaymentSchema
    },

    exec: async (nango) => {
        const organizationId = await resolveSyncOrganizationId(nango);
        const checkpoint = CheckpointSchema.nullable().parse(await nango.getCheckpoint());
        // A checkpoint left by a scan of another organization (metadata changed mid-scan) does not apply.
        const resume = checkpoint?.organization_id === organizationId ? checkpoint : null;

        // Full refresh: deletions are only detectable by a complete scan. The scan uses a
        // last_modified_time keyset cursor (see paginateByLastModifiedTime) rather than page offsets,
        // so resuming an interrupted scan cannot skip records that trackDeletesEnd would then delete.
        await nango.trackDeletesStart('CustomerPayment');

        const pages = paginateByLastModifiedTime(nango, {
            // https://www.zoho.com/inventory/api/v1/customer-payments/#list-customer-payments
            endpoint: '/inventory/v1/customerpayments',
            responseKey: 'customerpayments',
            organizationId,
            start: { cursor: resume?.last_modified_time || undefined, page: resume?.page ?? 1 }
        });

        for await (const { records: page, next, done } of pages) {
            const payments = z.array(ProviderCustomerPaymentSchema).parse(page).map(mapCustomerPayment);

            if (payments.length > 0) {
                await nango.batchSave(payments, 'CustomerPayment');
            }

            if (!done) {
                await nango.saveCheckpoint({ organization_id: organizationId, last_modified_time: next.cursor ?? '', page: next.page });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('CustomerPayment');
    }
});

function mapCustomerPayment(payment: z.infer<typeof ProviderCustomerPaymentSchema>) {
    const checkDetails = payment.check_details;

    return {
        id: payment.payment_id,
        payment_number: payment.payment_number ?? '',
        invoice_numbers: payment.invoice_numbers ?? '',
        date: payment.date ?? '',
        payment_mode: payment.payment_mode ?? '',
        payment_mode_formatted: payment.payment_mode_formatted ?? '',
        amount: payment.amount ?? 0,
        bcy_amount: payment.bcy_amount ?? 0,
        unused_amount: payment.unused_amount ?? 0,
        bcy_unused_amount: payment.bcy_unused_amount ?? 0,
        account_id: payment.account_id ?? '',
        account_name: payment.account_name ?? '',
        description: payment.description ?? '',
        reference_number: payment.reference_number ?? '',
        is_paid_via_check: payment.is_paid_via_check ?? false,
        check_details: {
            check_id: checkDetails?.check_id ?? '',
            check_status: checkDetails?.check_status ?? '',
            check_number: checkDetails?.check_number ?? '',
            memo: checkDetails?.memo ?? '',
            expiry_date: checkDetails?.expiry_date ?? '',
            clearance_account_id: checkDetails?.clearance_account_id ?? ''
        },
        customer_id: payment.customer_id ?? '',
        customer_name: payment.customer_name ?? '',
        created_time: payment.created_time ?? '',
        last_modified_time: payment.last_modified_time ?? '',
        last_four_digits: payment.last_four_digits ?? '',
        gateway_transaction_id: payment.gateway_transaction_id ?? '',
        payment_gateway: payment.payment_gateway ?? '',
        bcy_refunded_amount: payment.bcy_refunded_amount ?? 0,
        has_attachment: payment.has_attachment ?? false,
        applied_invoices: (payment.applied_invoices ?? []).map((invoice) => ({
            invoice_id: invoice.invoice_id ?? '',
            invoice_number: invoice.invoice_number ?? '',
            invoice_payment_id: invoice.invoice_payment_id ?? '',
            amount_applied: invoice.amount_applied ?? 0,
            total: invoice.total ?? 0,
            balance: invoice.balance ?? 0,
            date: invoice.date ?? '',
            due_date: invoice.due_date ?? ''
        })),
        tags: (payment.tags ?? []).map((tag) => ({
            tag_id: tag.tag_id ?? '',
            tag_name: tag.tag_name ?? ''
        })),
        documents: payment.documents ?? '',
        custom_fields_list: payment.custom_fields_list ?? '',
        tax_account_id: payment.tax_account_id ?? '',
        tax_account_name: payment.tax_account_name ?? '',
        tax_amount_withheld: payment.tax_amount_withheld ?? 0,
        payment_type: payment.payment_type ?? '',
        payment_status: payment.payment_status ?? '',
        settlement_status: payment.settlement_status ?? '',
        sales_channel: payment.sales_channel ?? ''
    };
}

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
