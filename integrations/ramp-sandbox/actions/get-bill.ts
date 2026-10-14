import { z } from 'zod';
import { createAction } from 'nango';

const CurrencyAmountSchema = z.object({
    amount: z.number().describe('Amount in the smallest denomination of the currency (e.g. cents for USD). Example: 73005 for $730.05'),
    currency_code: z.string().describe('ISO 4217 currency code of the amount. Example: "USD"'),
    minor_unit_conversion_rate: z.number().describe('Factor to convert the minor-unit amount to the real value; divide amount by this. Example: 100 for USD')
});

const AccountingFieldSchema = z.object({
    id: z.string().describe('Unique identifier of the accounting field within Ramp'),
    name: z.string().describe('Name of the accounting field'),
    external_id: z.string().describe('External identifier of the accounting field on the client side'),
    type: z.string().describe('Accounting field type. Example: "GL_ACCOUNT" or "SUBSIDIARY"')
});

const AccountingFieldSelectionSchema = z.object({
    id: z.string().describe('Unique identifier of the accounting field option within Ramp'),
    name: z.string().describe('Name of the accounting field option'),
    external_id: z.string().describe('External identifier of the accounting field option on the client side'),
    external_code: z.string().nullable().optional().describe('External code of the accounting field option shown on the ERP, when set'),
    display_name: z.string().nullable().optional().describe('Customer-set display name for the option in Ramp, when overridden'),
    provider_name: z.string().nullable().optional().describe('Name of the accounting provider that owns the field'),
    category_info: AccountingFieldSchema.optional().describe('Accounting category (field) this option belongs to')
});

const LineItemSchema = z.object({
    id: z.string().describe('Unique identifier of the line item, stable across bill updates'),
    amount: CurrencyAmountSchema.optional().describe('Line item amount in the smallest denomination of the currency'),
    memo: z.string().optional().describe('Memo text of the line item'),
    posting_gl_account: z.string().nullable().optional().describe('General-ledger account the line item was posted to, when available'),
    purchase_order_line_item_id: z.string().nullable().optional().describe('Identifier of the matched purchase order line item, if any'),
    item_receipt_line_item_ids: z.array(z.string()).optional().describe('Identifiers of item receipt line items linked through a matched purchase order'),
    accounting_field_selections: z.array(AccountingFieldSelectionSchema).optional().describe('Accounting field options selected to code the line item')
});

const InventoryLineItemSchema = z.object({
    id: z.string().describe('Unique identifier of the inventory line item'),
    amount: CurrencyAmountSchema.optional().describe('Line item amount, equal to quantity multiplied by unit price'),
    unit_price: CurrencyAmountSchema.optional().describe('Unit price of the inventory line item'),
    quantity: z.number().optional().describe('Quantity of the inventory line item'),
    memo: z.string().optional().describe('Memo text of the inventory line item'),
    purchase_order_line_item_id: z.string().nullable().optional().describe('Identifier of the matched purchase order line item, if any'),
    item_receipt_line_item_ids: z.array(z.string()).optional().describe('Identifiers of item receipt line items linked through a matched purchase order'),
    accounting_field_selections: z
        .array(AccountingFieldSelectionSchema)
        .optional()
        .describe('Accounting field options selected to code the inventory line item')
});

const BillOwnerSchema = z.object({
    id: z.string().describe('Unique identifier of the bill owner'),
    first_name: z.string().optional().describe('Bill owner first name'),
    last_name: z.string().optional().describe('Bill owner last name')
});

const VendorSchema = z.object({
    id: z.string().describe('Unique identifier of the vendor'),
    name: z.string().describe('Name of the vendor'),
    type: z.string().optional().describe('Vendor type. Example: "BUSINESS" or "INDIVIDUAL"'),
    remote_code: z.string().optional().describe('Vendor code in the remote ERP system, when synced'),
    remote_id: z.string().optional().describe('External identifier that uniquely identifies the vendor on the client side'),
    remote_name: z.string().optional().describe('Vendor name in the remote ERP system')
});

const AttachmentSchema = z.object({
    id: z.string().describe('Unique identifier of the bill attachment'),
    attachment_type: z.string().describe('Type of attachment: "INVOICE", "EMAIL", "FILE", or "VENDOR_CREDIT"'),
    url: z.string().describe('Short-lived pre-signed URL to download the attachment')
});

const AppliedVendorCreditSchema = z.object({
    id: z.string().describe('Unique identifier of the vendor credit'),
    amount: CurrencyAmountSchema.optional().describe('Amount of the vendor credit applied to this bill')
});

const RelatedBillSchema = z.object({
    bill_id: z.string().describe('Unique identifier of the associated bill'),
    label: z.string().describe('Display label for the associated bill as seen from this bill. Example: "Insurance bill"'),
    status: z.string().optional().describe('Payment status of the associated bill: "OPEN" or "PAID"'),
    amount: CurrencyAmountSchema.nullable().optional().describe('Amount of the associated bill in its invoice currency'),
    invoice_number: z.string().nullable().optional().describe('Invoice number of the associated bill'),
    vendor_name: z.string().nullable().optional().describe('Vendor name of the associated bill')
});

const TraceIdSchema = z.object({
    trace_id: z.string().nullable().optional().describe('Unique reference ID to the payment'),
    descriptor: z.string().nullable().optional().describe('Human-readable description of the trace ID. Example: "ACH Trace ID"')
});

const PaymentDetailsSchema = z.object({
    schema_type: z.string().optional().describe('Discriminator identifying the payment-details shape. Example: "VendorPaymentDetailsSchema"'),
    source_bank_account_id: z.string().nullable().optional().describe('Bank account the payment is drawn from, for vendor payments'),
    vendor_account_id: z.string().nullable().optional().describe('Vendor bank account receiving the payment, for vendor payments'),
    approval_status: z.string().nullable().optional().describe('Approval status of the payment when payment-step approvals are used'),
    is_same_day: z.boolean().optional().describe('Whether the payment is configured for same-day delivery'),
    fund_id: z.string().optional().describe('Fund the card bill payment is attributed to, for card payments'),
    transaction_ids: z.array(z.string()).optional().describe('Transaction IDs associated with a card bill payment'),
    manual_payment_method: z.string().nullable().optional().describe('Manual payment method used, for manually recorded payments')
});

const PaymentSchema = z.object({
    id: z.string().nullable().optional().describe('Unique identifier of the payment; bills sharing it belong to the same batch payment'),
    amount: CurrencyAmountSchema.optional().describe('Paid amount of the bill'),
    payment_method: z.string().nullable().optional().describe('Payment method. Example: "ACH", "DIRECT_DEBIT", or "CARD"'),
    payment_date: z.string().nullable().optional().describe('Scheduled or actual payment date'),
    effective_date: z.string().nullable().optional().describe('Date the payment is actually initiated, for non-card payment methods'),
    customer_friendly_payment_id: z.string().nullable().optional().describe('Customer-friendly payment identifier for non-card payment methods'),
    trace_id: TraceIdSchema.nullable().optional().describe('Trace ID for the payment, for non-card payment methods'),
    bank_debit_trace_id: TraceIdSchema.nullable().optional().describe('Bank-facing trace ID for the business bank debit leg of the payment'),
    details: PaymentDetailsSchema.optional().describe('Payment-method-specific details such as source and vendor bank accounts')
});

const InputSchema = z
    .object({
        bill_id: z.string().describe('Unique identifier of the bill to retrieve. Example: "6e3816e3-0e53-42ae-b075-bdb0adff10c4"')
    })
    .describe('Identifies the bill to retrieve.');

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the bill'),
        invoice_number: z.string().optional().describe('Invoice number on the bill'),
        remote_id: z.string().nullable().optional().describe('External identifier that identifies the bill on the client side'),
        status: z.string().optional().describe('Payment status of the bill: "OPEN" or "PAID"'),
        status_summary: z.string().optional().describe('Detailed status summary of the bill. Example: "PAYMENT_COMPLETED" or "ON_HOLD"'),
        approval_status: z.string().nullable().optional().describe('Approval status of the bill: "APPROVED", "PENDING", "REJECTED", etc.'),
        sync_status: z.string().optional().describe('Accounting sync status: "NOT_SYNCED", "BILL_SYNCED", or "BILL_AND_PAYMENT_SYNCED"'),
        amount: CurrencyAmountSchema.optional().describe('Total bill amount in the smallest denomination of the currency'),
        memo: z.string().optional().describe('Memo text of the bill'),
        vendor_memo: z.string().nullable().optional().describe('Memo to the vendor'),
        issued_at: z.string().optional().describe('Date the bill was issued on the invoice'),
        due_at: z.string().optional().describe('Date the bill payment is due'),
        paid_at: z.string().nullable().optional().describe('Date the bill was marked paid, or null while unpaid'),
        accounting_date: z.string().optional().describe('Date used for the bill for accounting purposes'),
        posting_date: z.string().optional().describe('Date the bill was posted to the ERP'),
        created_at: z.string().optional().describe('Timestamp when the bill was created'),
        draft_bill_created_at: z.string().nullable().optional().describe('Date the source draft bill was created, if applicable'),
        draft_bill_id: z.string().nullable().optional().describe('Identifier of the draft bill this bill was created from, if any'),
        archived_at: z.string().nullable().optional().describe('Timestamp when the bill was archived, if applicable'),
        entity_id: z.string().optional().describe('Identifier of the associated business entity'),
        vendor_contact_id: z.string().nullable().optional().describe('Identifier of the associated vendor contact'),
        purchase_order_id: z.string().nullable().optional().describe('Identifier of the matched purchase order, if any'),
        purchase_order_ids: z.array(z.string()).optional().describe('Identifiers of all purchase orders matched to the bill'),
        item_receipt_ids: z.array(z.string()).optional().describe('Identifiers of item receipts associated through matched purchase orders'),
        enable_accounting_sync: z.boolean().optional().describe('Whether the bill is configured to sync to the ERP'),
        is_payment_sync_ready: z.boolean().optional().describe('Whether the bill is ready for payment accounting export'),
        fx_conversion_rate: z.string().optional().describe('FX conversion rate from the invoice currency to the payer currency'),
        deep_link_url: z.string().nullable().optional().describe('Link to the bill in the ERP, when it exists'),
        bill_owner: BillOwnerSchema.optional().describe('Information about the bill owner'),
        vendor: VendorSchema.optional().describe('Vendor information of the bill'),
        line_items: z.array(LineItemSchema).optional().describe('List of line items related to the bill'),
        inventory_line_items: z.array(InventoryLineItemSchema).optional().describe('List of inventory line items related to the bill'),
        accounting_field_selections: z.array(AccountingFieldSelectionSchema).optional().describe('Accounting field options selected to code the bill'),
        applied_vendor_credits: z.array(AppliedVendorCreditSchema).optional().describe('Vendor credits applied to this bill'),
        related_bills: z.array(RelatedBillSchema).optional().describe('Bills associated with this bill, returned only when bill associations are enabled'),
        attachments: z.array(AttachmentSchema).optional().describe('Business-visible bill attachments with their download URLs'),
        invoice_urls: z.array(z.string()).optional().describe('Short-lived pre-signed URLs for all business-visible bill attachments'),
        payment: PaymentSchema.nullable().optional().describe('First non-vendor-credit payment for the bill, when present'),
        payments: z.array(PaymentSchema).optional().describe('All payments for the bill')
    })
    .describe('A single Ramp bill with its amount, status, payment, line-item, vendor, and attachment details.');

/**
 * @tags: [read]
 * @tagReason: Retrieves an existing bill from Ramp without modifying any provider state.
 * @pitfalls: Amounts are in the currency's minor unit (e.g. cents), so divide by minor_unit_conversion_rate for the real value; an unpaid bill can still return a non-null payment object with null payment_date/effective_date (use status and paid_at to determine payment state), and attachment/invoice URLs are pre-signed and expire.
 */
const action = createAction({
    description: 'Retrieve a single bill by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['bills:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.ramp.com/developer-api/v1/overview/introduction
            endpoint: `/developer/v1/bills/${encodeURIComponent(input.bill_id)}`,
            retries: 3
        });

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
