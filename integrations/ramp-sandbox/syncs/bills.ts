import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const PAGE_SIZE = 100;
const FULL_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

const CurrencyAmountSchema = z.object({
    amount: z.number().describe('Monetary amount in the smallest denomination of the currency (e.g. cents for USD).'),
    currency_code: z.string().describe('ISO 4217 currency code of the amount (e.g. USD).'),
    minor_unit_conversion_rate: z
        .number()
        .nullable()
        .optional()
        .describe('Factor used to convert the integer amount to the actual currency value (e.g. 100 for USD). Null when unknown.')
});

const AccountingFieldSchema = z.object({
    id: z.string().describe('Unique identifier of the accounting field within Ramp.'),
    name: z.string().describe('Name of the accounting field.'),
    external_id: z.string().describe('Identifier that uniquely identifies the accounting field in the connected ERP.'),
    type: z.string().optional().describe('Accounting field type (e.g. GL_ACCOUNT, COST_CENTER, PROJECT).')
});

const AccountingFieldSelectionSchema = z.object({
    id: z.string().describe('Unique identifier of the accounting field option within Ramp.'),
    name: z.string().describe('Name of the accounting field option.'),
    external_id: z.string().describe('Identifier that uniquely identifies the accounting field option in the connected ERP.'),
    display_name: z.string().nullable().optional().describe('Customer-set display name for the option in Ramp, when overridden.'),
    external_code: z.string().nullable().optional().describe('External code of the accounting field option as displayed in the ERP.'),
    provider_name: z.string().nullable().optional().describe('Name of the accounting provider that supplied the field option.'),
    category_info: AccountingFieldSchema.optional().describe('Accounting field (category) that this selection belongs to.')
});

const BillOwnerSchema = z.object({
    id: z.string().describe('Unique identifier of the bill owner.'),
    first_name: z.string().optional().describe('First name of the bill owner.'),
    last_name: z.string().optional().describe('Last name of the bill owner.')
});

const BillVendorSchema = z.object({
    id: z.string().describe('Unique identifier of the vendor.'),
    name: z.string().describe('Name of the vendor.'),
    type: z.string().optional().describe('Vendor type, either BUSINESS or INDIVIDUAL.'),
    remote_code: z.string().optional().describe('Vendor code that usually uniquely identifies the vendor in the remote ERP.'),
    remote_id: z.string().optional().describe('External identifier that uniquely identifies the vendor on the client side.'),
    remote_name: z.string().optional().describe('Vendor name as stored in the remote ERP.')
});

const BillTraceIdSchema = z.object({
    descriptor: z.string().optional().describe('Human-readable description of the trace ID (e.g. ACH Trace ID or Check Number).'),
    trace_id: z.string().optional().describe('Unique reference ID to the payment for this bill.')
});

const BillPaymentDetailsSchema = z.object({
    schema_type: z
        .string()
        .optional()
        .describe('Discriminator identifying the payment details shape (e.g. VendorPaymentDetailsSchema, CardPaymentDetailsSchema).'),
    vendor_account_id: z.string().nullable().optional().describe('Identifier of the vendor account used for this payment, if any.'),
    approval_status: z.string().nullable().optional().describe('Approval status of the payment when payment-step approvals are used.'),
    source_bank_account_id: z.string().nullable().optional().describe('Identifier of the source bank account used for this payment, if any.'),
    is_same_day: z.boolean().optional().describe('Whether the payment is configured for same-day delivery.'),
    fund_id: z.string().optional().describe('Identifier of the fund attributed to a card bill payment.'),
    spend_limit_id: z.string().optional().describe('Deprecated alias of fund_id for the fund attributed to a card bill payment.'),
    transaction_ids: z.array(z.string()).optional().describe('Transaction identifiers associated with a card bill payment.'),
    manual_payment_method: z.string().nullable().optional().describe('Manual payment method used when the bill was paid outside of Ramp.')
});

const BillPaymentSchema = z.object({
    id: z.string().nullable().optional().describe('Unique identifier of the payment; bills sharing it belong to the same batch payment.'),
    amount: CurrencyAmountSchema.optional().describe('Paid amount of the bill.'),
    payment_method: z.string().nullable().optional().describe('Method used to pay the bill (e.g. ACH, CHECK, CARD, DOMESTIC_WIRE).'),
    payment_date: z.string().nullable().optional().describe('Scheduled initiation date for non-card payments, or the scheduled card payment date.'),
    effective_date: z.string().nullable().optional().describe('For non-card payment methods, the date the payment is actually initiated.'),
    customer_friendly_payment_id: z.string().nullable().optional().describe('Customer-friendly payment identifier for non-card payment methods.'),
    trace_id: BillTraceIdSchema.nullable()
        .optional()
        .describe('Trace ID for non-card payments; only returned by the single-bill endpoint, not the list endpoint.'),
    bank_debit_trace_id: BillTraceIdSchema.nullable().optional().describe('Bank-facing trace reference for the business bank debit leg of the payment.'),
    details: BillPaymentDetailsSchema.nullable().optional().describe('Payment details specific to the payment method.')
});

const WithholdingLineItemSchema = z.object({
    gross_amount: z
        .object({
            currency: z.string().describe('ISO 4217 currency code of the gross amount.'),
            value: z.number().describe('Gross amount value in the smallest denomination of the currency.')
        })
        .optional()
        .describe('Gross amount of the line item before retainage withholding.'),
    withholding_amount: z
        .object({
            currency: z.string().describe('ISO 4217 currency code of the withholding amount.'),
            value: z.number().describe('Retainage withholding amount value in the smallest denomination of the currency.')
        })
        .optional()
        .describe('Retainage withholding amount for the line item.'),
    withholding_percentage: z.string().nullable().optional().describe('Retainage withholding percentage for the line item.')
});

const BillLineItemSchema = z.object({
    id: z.string().describe('Unique identifier of the line item, stable across bill updates and draft-to-bill conversion.'),
    amount: CurrencyAmountSchema.optional().describe('Amount of the line item in the smallest denomination of the currency.'),
    memo: z.string().optional().describe('Memo of the line item.'),
    accounting_field_selections: z.array(AccountingFieldSelectionSchema).optional().describe('Accounting field options selected to code the line item.'),
    item_receipt_line_item_ids: z.array(z.string()).optional().describe('Item receipt line item identifiers matched to this bill line item.'),
    purchase_order_line_item_id: z.string().nullable().optional().describe('Identifier of the matched purchase order line item, if any.'),
    posting_gl_account: z.string().nullable().optional().describe('GL account used when posting the line item to the ERP, if any.'),
    withholding_line_item: WithholdingLineItemSchema.nullable().optional().describe('Retainage withholding details for the line item, if applicable.')
});

const BillInventoryLineItemSchema = z.object({
    id: z.string().describe('Unique identifier of the inventory line item, stable across bill updates and draft-to-bill conversion.'),
    amount: CurrencyAmountSchema.optional().describe('Amount of the inventory line item in the smallest denomination of the currency.'),
    memo: z.string().optional().describe('Memo of the inventory line item.'),
    quantity: z.number().optional().describe('Quantity of the inventory line item.'),
    unit_price: CurrencyAmountSchema.optional().describe('Unit price of the inventory line item in the smallest denomination of the currency.'),
    accounting_field_selections: z
        .array(AccountingFieldSelectionSchema)
        .optional()
        .describe('Accounting field options selected to code the inventory line item.'),
    item_receipt_line_item_ids: z.array(z.string()).optional().describe('Item receipt line item identifiers matched to this inventory line item.'),
    purchase_order_line_item_id: z.string().nullable().optional().describe('Identifier of the matched purchase order line item, if any.'),
    withholding_line_item: WithholdingLineItemSchema.nullable().optional().describe('Retainage withholding details for the inventory line item, if applicable.')
});

const BillAttachmentSchema = z.object({
    id: z.string().describe('Unique identifier of the bill attachment.'),
    attachment_type: z.string().optional().describe('Type of attachment, one of EMAIL, FILE, INVOICE or VENDOR_CREDIT.'),
    url: z.string().optional().describe('Pre-signed URL to download the attachment.')
});

const AppliedVendorCreditSchema = z.object({
    id: z.string().describe('Unique identifier of the applied vendor credit.'),
    amount: CurrencyAmountSchema.optional().describe('Amount of the vendor credit applied to this bill.')
});

const BillSchema = z
    .object({
        id: z.string().describe('Unique identifier of the bill.'),
        invoice_number: z.string().optional().describe('Invoice number on the bill as provided by the vendor.'),
        status: z.string().optional().describe('Payment status of the bill, either OPEN or PAID.'),
        status_summary: z.string().optional().describe('Detailed status summary of the bill (e.g. APPROVAL_PENDING, PAYMENT_SCHEDULED, PAYMENT_COMPLETED).'),
        approval_status: z.string().nullable().optional().describe('Approval status of the bill, or null when the bill has no approval chain.'),
        sync_status: z.string().optional().describe('Accounting sync status of the bill, one of BILL_AND_PAYMENT_SYNCED, BILL_SYNCED or NOT_SYNCED.'),
        amount: CurrencyAmountSchema.optional().describe('Total amount of the bill.'),
        accounting_date: z.string().optional().describe('Date used for accounting purposes, falling back to the bill issue date.'),
        issued_at: z.string().optional().describe('Date the bill was issued on the invoice.'),
        due_at: z.string().optional().describe('Date the bill payment is due.'),
        paid_at: z.string().nullable().optional().describe('Date the bill payment status was set to PAID, or null while the bill is OPEN.'),
        posting_date: z.string().nullable().optional().describe('Date the bill was posted to the ERP, or null if not yet posted.'),
        created_at: z.string().optional().describe('Date the bill was created in Ramp.'),
        draft_bill_created_at: z
            .string()
            .nullable()
            .optional()
            .describe('Date the draft bill was created when this bill originated from a draft bill, otherwise null.'),
        draft_bill_id: z.string().nullable().optional().describe('Identifier of the draft bill this bill was created from, if any.'),
        archived_at: z.string().nullable().optional().describe('Date the bill was archived, or null when the bill is active.'),
        entity_id: z.string().optional().describe('Identifier of the business entity that owns the bill.'),
        remote_id: z.string().nullable().optional().describe('External identifier of the bill on the client side.'),
        deep_link_url: z.string().nullable().optional().describe('Link to the bill in the ERP, if it exists.'),
        memo: z.string().nullable().optional().describe('Internal memo on the bill.'),
        vendor_memo: z.string().nullable().optional().describe('Memo shown to the vendor.'),
        enable_accounting_sync: z.boolean().optional().describe('Whether the bill is configured to sync to the ERP.'),
        is_payment_sync_ready: z.boolean().optional().describe('Whether the bill is ready for payment accounting export.'),
        fx_conversion_rate: z.string().optional().describe('Foreign exchange conversion rate from the invoice currency to the payer currency.'),
        bill_owner: BillOwnerSchema.optional().describe('Information about the bill owner.'),
        vendor: BillVendorSchema.optional().describe('Vendor information for the bill.'),
        vendor_contact_id: z.string().nullable().optional().describe('Identifier of the associated vendor contact, if any.'),
        purchase_order_id: z.string().nullable().optional().describe('Identifier of the matched purchase order, if any.'),
        purchase_order_ids: z.array(z.string()).optional().describe('Identifiers of all purchase orders matched to the bill.'),
        payment: BillPaymentSchema.nullable().optional().describe('Payment information for the bill, or null when no payment exists.'),
        line_items: z.array(BillLineItemSchema).optional().describe('Line items on the bill.'),
        inventory_line_items: z.array(BillInventoryLineItemSchema).optional().describe('Inventory line items related to the bill.'),
        accounting_field_selections: z.array(AccountingFieldSelectionSchema).optional().describe('Accounting field options selected to code the bill.'),
        applied_vendor_credits: z.array(AppliedVendorCreditSchema).optional().describe('Vendor credits applied to the bill.'),
        attachments: z.array(BillAttachmentSchema).optional().describe('Business-visible attachments on the bill.'),
        item_receipt_ids: z.array(z.string()).optional().describe('Identifiers of item receipts associated with the bill through matched purchase orders.'),
        invoice_urls: z.array(z.string()).optional().describe('Pre-signed URLs for all business-visible bill attachments, including the invoice document.')
    })
    .describe('A Ramp Bill Pay bill with its status, approval, payment and line item details.');

const CheckpointSchema = z.object({
    updated_after: z.string().describe('created_at high-water mark used by incremental runs to fetch newly created bills.'),
    full_refresh_at: z.string().describe('Timestamp of the last completed full refresh that detected deletions.')
});

const sync = createSync({
    description: 'Syncs Bill Pay bills from Ramp, including their status, approval, payment and line item details.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Bill: BillSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const updatedAfter = checkpoint?.updated_after;
        const fullRefreshAt = checkpoint?.full_refresh_at;

        const fullRefreshAgeMs = fullRefreshAt !== undefined ? Date.now() - Date.parse(fullRefreshAt) : Number.POSITIVE_INFINITY;
        const shouldFullRefresh =
            updatedAfter === undefined || fullRefreshAt === undefined || !Number.isFinite(fullRefreshAgeMs) || fullRefreshAgeMs >= FULL_REFRESH_INTERVAL_MS;

        let maxCreatedAt: string | undefined;
        let isFullRefresh = false;

        if (shouldFullRefresh) {
            // First run, or the periodic full refresh is due. Ramp has no generic updated_after filter
            // on bills, so a full scan from page 1 is the only way to detect deletions and to catch
            // status/approval/payment changes on already-synced bills.
            isFullRefresh = true;

            // Safe to call on every execution: it does not reopen a delete-tracking window that is
            // already open, and the window is closed by trackDeletesEnd once the full scan completes.
            await nango.trackDeletesStart('Bill');

            const proxyConfig: ProxyConfiguration = {
                // https://docs.ramp.com/openapi/developer-api.json (GET /developer/v1/bills)
                endpoint: '/developer/v1/bills',
                params: {
                    page_size: PAGE_SIZE
                },
                paginate: {
                    type: 'link',
                    link_path_in_response_body: 'page.next',
                    limit_name_in_request: 'page_size',
                    limit: PAGE_SIZE,
                    response_path: 'data'
                },
                retries: 3
            };

            for await (const bills of nango.paginate<z.infer<typeof BillSchema>>(proxyConfig)) {
                if (bills.length > 0) {
                    await nango.batchSave(bills, 'Bill');
                }

                for (const bill of bills) {
                    if (bill.created_at !== undefined && (maxCreatedAt === undefined || bill.created_at > maxCreatedAt)) {
                        maxCreatedAt = bill.created_at;
                    }
                }
            }
        } else if (updatedAfter !== undefined && fullRefreshAt !== undefined) {
            // Incremental run: fetch only bills created since the last run. This is not delete-tracked
            // because a changed-only request omits unchanged bills, which would look like deletions.
            maxCreatedAt = updatedAfter;

            const proxyConfig: ProxyConfiguration = {
                // https://docs.ramp.com/openapi/developer-api.json (GET /developer/v1/bills)
                endpoint: '/developer/v1/bills',
                params: {
                    page_size: PAGE_SIZE,
                    from_created_at: updatedAfter
                },
                paginate: {
                    type: 'link',
                    link_path_in_response_body: 'page.next',
                    limit_name_in_request: 'page_size',
                    limit: PAGE_SIZE,
                    response_path: 'data'
                },
                retries: 3
            };

            for await (const bills of nango.paginate<z.infer<typeof BillSchema>>(proxyConfig)) {
                if (bills.length > 0) {
                    await nango.batchSave(bills, 'Bill');
                }

                for (const bill of bills) {
                    if (bill.created_at !== undefined && (maxCreatedAt === undefined || bill.created_at > maxCreatedAt)) {
                        maxCreatedAt = bill.created_at;
                    }
                }
            }
        }

        const completedAt = new Date().toISOString();

        if (isFullRefresh) {
            // Persist progress only once the full scan is saved, then close the delete-tracking window
            // so records missing from this complete scan are detected as deleted.
            await nango.clearCheckpoint();
            await nango.trackDeletesEnd('Bill');
            await nango.saveCheckpoint({
                updated_after: maxCreatedAt ?? completedAt,
                full_refresh_at: completedAt
            });
        } else if (updatedAfter !== undefined && fullRefreshAt !== undefined) {
            await nango.saveCheckpoint({
                updated_after: maxCreatedAt ?? updatedAfter,
                full_refresh_at: fullRefreshAt
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
