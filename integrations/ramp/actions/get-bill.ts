import { z } from 'zod';
import { createAction } from 'nango';

// Raw provider schemas (https://docs.ramp.com/openapi/developer-api.json, components Bill / ApiBill*).
// Fields the docs mark optional are also returned as explicit null live (e.g. memo, vendor_memo, posting_date on archived bills), so they accept both.
const ProviderCurrencyAmountSchema = z.object({
    amount: z.number(),
    currency_code: z.string(),
    minor_unit_conversion_rate: z.number().nullable()
});

const ProviderAccountingFieldSchema = z.object({
    id: z.string(),
    name: z.string(),
    external_id: z.string(),
    type: z.string()
});

const ProviderAccountingFieldSelectionSchema = z.object({
    id: z.string(),
    name: z.string(),
    external_id: z.string(),
    external_code: z.string().nullish(),
    display_name: z.string().nullable(),
    provider_name: z.string().nullable(),
    category_info: ProviderAccountingFieldSchema.optional()
});

const ProviderLineItemSchema = z.object({
    id: z.string(),
    amount: ProviderCurrencyAmountSchema,
    memo: z.string().nullish(),
    posting_gl_account: z.string().nullish(),
    purchase_order_line_item_id: z.string().nullable(),
    item_receipt_line_item_ids: z.array(z.string()),
    accounting_field_selections: z.array(ProviderAccountingFieldSelectionSchema)
});

const ProviderInventoryLineItemSchema = z.object({
    id: z.string(),
    amount: ProviderCurrencyAmountSchema,
    unit_price: ProviderCurrencyAmountSchema,
    quantity: z.number(),
    memo: z.string().nullish(),
    purchase_order_line_item_id: z.string().nullable(),
    item_receipt_line_item_ids: z.array(z.string()),
    accounting_field_selections: z.array(ProviderAccountingFieldSelectionSchema)
});

const ProviderBillOwnerSchema = z.object({
    id: z.string(),
    first_name: z.string().nullish(),
    last_name: z.string().nullish()
});

const ProviderVendorSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string().nullish(),
    remote_code: z.string().nullish(),
    remote_id: z.string().nullish(),
    remote_name: z.string().nullish()
});

const ProviderAttachmentSchema = z.object({
    id: z.string(),
    attachment_type: z.string(),
    url: z.string()
});

const ProviderAppliedVendorCreditSchema = z.object({
    id: z.string(),
    amount: ProviderCurrencyAmountSchema
});

const ProviderRelatedBillSchema = z.object({
    bill_id: z.string(),
    label: z.string(),
    status: z.string(),
    amount: ProviderCurrencyAmountSchema.nullable(),
    invoice_number: z.string().nullable(),
    vendor_name: z.string().nullable()
});

const ProviderTraceIdSchema = z.object({
    trace_id: z.string().nullish(),
    descriptor: z.string().nullish()
});

const ProviderPaymentDetailsSchema = z.object({
    schema_type: z.string().nullish(),
    source_bank_account_id: z.string().nullish(),
    vendor_account_id: z.string().nullish(),
    approval_status: z.string().nullish(),
    is_same_day: z.boolean().nullish(),
    fund_id: z.string().nullish(),
    transaction_ids: z.array(z.string()).nullish(),
    manual_payment_method: z.string().nullish()
});

const ProviderPaymentSchema = z.object({
    id: z.string().nullable(),
    amount: ProviderCurrencyAmountSchema,
    payment_method: z.string().nullable(),
    payment_date: z.string().nullable(),
    effective_date: z.string().nullable(),
    customer_friendly_payment_id: z.string().nullable(),
    trace_id: ProviderTraceIdSchema.nullable(),
    bank_debit_trace_id: ProviderTraceIdSchema.nullish(),
    details: ProviderPaymentDetailsSchema.nullish()
});

const ProviderBillSchema = z.object({
    id: z.string(),
    invoice_number: z.string().nullish(),
    remote_id: z.string().nullish(),
    status: z.string(),
    status_summary: z.string(),
    approval_status: z.string().nullable(),
    sync_status: z.string(),
    amount: ProviderCurrencyAmountSchema,
    memo: z.string().nullish(),
    vendor_memo: z.string().nullish(),
    issued_at: z.string(),
    due_at: z.string(),
    paid_at: z.string().nullish(),
    accounting_date: z.string(),
    posting_date: z.string().nullish(),
    created_at: z.string(),
    draft_bill_created_at: z.string().nullable(),
    draft_bill_id: z.string().nullable(),
    archived_at: z.string().nullable(),
    entity_id: z.string(),
    vendor_contact_id: z.string().nullable(),
    purchase_order_id: z.string().nullish(),
    purchase_order_ids: z.array(z.string()).nullish(),
    item_receipt_ids: z.array(z.string()),
    enable_accounting_sync: z.boolean().nullish(),
    is_payment_sync_ready: z.boolean(),
    fx_conversion_rate: z.string(),
    deep_link_url: z.string().nullish(),
    bill_owner: ProviderBillOwnerSchema,
    vendor: ProviderVendorSchema,
    line_items: z.array(ProviderLineItemSchema),
    inventory_line_items: z.array(ProviderInventoryLineItemSchema),
    accounting_field_selections: z.array(ProviderAccountingFieldSelectionSchema),
    applied_vendor_credits: z.array(ProviderAppliedVendorCreditSchema),
    related_bills: z.array(ProviderRelatedBillSchema).nullish(),
    attachments: z.array(ProviderAttachmentSchema),
    invoice_urls: z.array(z.string()),
    payment: ProviderPaymentSchema.nullable(),
    payments: z.array(ProviderPaymentSchema).nullish()
});

const CurrencyAmountSchema = z.object({
    amount: z.number().describe('Amount in the smallest denomination of the currency (e.g. cents for USD). Example: 73005 for $730.05'),
    currency_code: z.string().describe('ISO 4217 currency code of the amount. Example: "USD"'),
    minor_unit_conversion_rate: z
        .number()
        .optional()
        .describe(
            'Factor to convert the minor-unit amount to the real value; divide amount by this. Example: 100 for USD. Omitted when Ramp does not report it'
        )
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
    external_code: z.string().optional().describe('External code of the accounting field option shown on the ERP, when set'),
    display_name: z.string().optional().describe('Customer-set display name for the option in Ramp, when overridden'),
    provider_name: z.string().optional().describe('Name of the accounting provider that owns the field'),
    category_info: AccountingFieldSchema.optional().describe('Accounting category (field) this option belongs to')
});

const LineItemSchema = z.object({
    id: z.string().describe('Unique identifier of the line item, stable across bill updates'),
    amount: CurrencyAmountSchema.optional().describe('Line item amount in the smallest denomination of the currency'),
    memo: z.string().optional().describe('Memo text of the line item'),
    posting_gl_account: z.string().optional().describe('General-ledger account the line item was posted to, when available'),
    purchase_order_line_item_id: z.string().optional().describe('Identifier of the matched purchase order line item, if any'),
    item_receipt_line_item_ids: z.array(z.string()).optional().describe('Identifiers of item receipt line items linked through a matched purchase order'),
    accounting_field_selections: z.array(AccountingFieldSelectionSchema).optional().describe('Accounting field options selected to code the line item')
});

const InventoryLineItemSchema = z.object({
    id: z.string().describe('Unique identifier of the inventory line item'),
    amount: CurrencyAmountSchema.optional().describe('Line item amount, equal to quantity multiplied by unit price'),
    unit_price: CurrencyAmountSchema.optional().describe('Unit price of the inventory line item'),
    quantity: z.number().optional().describe('Quantity of the inventory line item'),
    memo: z.string().optional().describe('Memo text of the inventory line item'),
    purchase_order_line_item_id: z.string().optional().describe('Identifier of the matched purchase order line item, if any'),
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
    amount: CurrencyAmountSchema.optional().describe('Amount of the associated bill in its invoice currency'),
    invoice_number: z.string().optional().describe('Invoice number of the associated bill'),
    vendor_name: z.string().optional().describe('Vendor name of the associated bill')
});

const TraceIdSchema = z.object({
    trace_id: z.string().optional().describe('Unique reference ID to the payment'),
    descriptor: z.string().optional().describe('Human-readable description of the trace ID. Example: "ACH Trace ID"')
});

const PaymentDetailsSchema = z.object({
    schema_type: z.string().optional().describe('Discriminator identifying the payment-details shape. Example: "VendorPaymentDetailsSchema"'),
    source_bank_account_id: z.string().optional().describe('Bank account the payment is drawn from, for vendor payments'),
    vendor_account_id: z.string().optional().describe('Vendor bank account receiving the payment, for vendor payments'),
    approval_status: z.string().optional().describe('Approval status of the payment when payment-step approvals are used'),
    is_same_day: z.boolean().optional().describe('Whether the payment is configured for same-day delivery'),
    fund_id: z.string().optional().describe('Fund the card bill payment is attributed to, for card payments'),
    transaction_ids: z.array(z.string()).optional().describe('Transaction IDs associated with a card bill payment'),
    manual_payment_method: z.string().optional().describe('Manual payment method used, for manually recorded payments')
});

const PaymentSchema = z.object({
    id: z.string().optional().describe('Unique identifier of the payment; bills sharing it belong to the same batch payment'),
    amount: CurrencyAmountSchema.optional().describe('Paid amount of the bill'),
    payment_method: z.string().optional().describe('Payment method. Example: "ACH", "DIRECT_DEBIT", or "CARD"'),
    payment_date: z.string().optional().describe('Scheduled or actual payment date'),
    effective_date: z.string().optional().describe('Date the payment is actually initiated, for non-card payment methods'),
    customer_friendly_payment_id: z.string().optional().describe('Customer-friendly payment identifier for non-card payment methods'),
    trace_id: TraceIdSchema.optional().describe('Trace ID for the payment, for non-card payment methods'),
    bank_debit_trace_id: TraceIdSchema.optional().describe('Bank-facing trace ID for the business bank debit leg of the payment'),
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
        remote_id: z.string().optional().describe('External identifier that identifies the bill on the client side'),
        status: z.string().optional().describe('Payment status of the bill: "OPEN" or "PAID"'),
        status_summary: z.string().optional().describe('Detailed status summary of the bill. Example: "PAYMENT_COMPLETED" or "ON_HOLD"'),
        approval_status: z.string().optional().describe('Approval status of the bill: "APPROVED", "PENDING", "REJECTED", etc.'),
        sync_status: z.string().optional().describe('Accounting sync status: "NOT_SYNCED", "BILL_SYNCED", or "BILL_AND_PAYMENT_SYNCED"'),
        amount: CurrencyAmountSchema.optional().describe('Total bill amount in the smallest denomination of the currency'),
        memo: z.string().optional().describe('Memo text of the bill'),
        vendor_memo: z.string().optional().describe('Memo to the vendor'),
        issued_at: z.string().optional().describe('Date the bill was issued on the invoice'),
        due_at: z.string().optional().describe('Date the bill payment is due'),
        paid_at: z.string().optional().describe('Date the bill was marked paid, or null while unpaid'),
        accounting_date: z.string().optional().describe('Date used for the bill for accounting purposes'),
        posting_date: z.string().optional().describe('Date the bill was posted to the ERP'),
        created_at: z.string().optional().describe('Timestamp when the bill was created'),
        draft_bill_created_at: z.string().optional().describe('Date the source draft bill was created, if applicable'),
        draft_bill_id: z.string().optional().describe('Identifier of the draft bill this bill was created from, if any'),
        archived_at: z.string().optional().describe('Timestamp when the bill was archived, if applicable'),
        entity_id: z.string().optional().describe('Identifier of the associated business entity'),
        vendor_contact_id: z.string().optional().describe('Identifier of the associated vendor contact'),
        purchase_order_id: z.string().optional().describe('Identifier of the matched purchase order, if any'),
        purchase_order_ids: z.array(z.string()).optional().describe('Identifiers of all purchase orders matched to the bill'),
        item_receipt_ids: z.array(z.string()).optional().describe('Identifiers of item receipts associated through matched purchase orders'),
        enable_accounting_sync: z.boolean().optional().describe('Whether the bill is configured to sync to the ERP'),
        is_payment_sync_ready: z.boolean().optional().describe('Whether the bill is ready for payment accounting export'),
        fx_conversion_rate: z.string().optional().describe('FX conversion rate from the invoice currency to the payer currency'),
        deep_link_url: z.string().optional().describe('Link to the bill in the ERP, when it exists'),
        bill_owner: BillOwnerSchema.optional().describe('Information about the bill owner'),
        vendor: VendorSchema.optional().describe('Vendor information of the bill'),
        line_items: z.array(LineItemSchema).optional().describe('List of line items related to the bill'),
        inventory_line_items: z.array(InventoryLineItemSchema).optional().describe('List of inventory line items related to the bill'),
        accounting_field_selections: z.array(AccountingFieldSelectionSchema).optional().describe('Accounting field options selected to code the bill'),
        applied_vendor_credits: z.array(AppliedVendorCreditSchema).optional().describe('Vendor credits applied to this bill'),
        related_bills: z.array(RelatedBillSchema).optional().describe('Bills associated with this bill, returned only when bill associations are enabled'),
        attachments: z.array(AttachmentSchema).optional().describe('Business-visible bill attachments with their download URLs'),
        invoice_urls: z.array(z.string()).optional().describe('Short-lived pre-signed URLs for all business-visible bill attachments'),
        payment: PaymentSchema.optional().describe('First non-vendor-credit payment for the bill, when present'),
        payments: z.array(PaymentSchema).optional().describe('All payments for the bill')
    })
    .describe('A single Ramp bill with its amount, status, payment, line-item, vendor, and attachment details.');

type ProviderCurrencyAmount = z.infer<typeof ProviderCurrencyAmountSchema>;
type ProviderAccountingFieldSelection = z.infer<typeof ProviderAccountingFieldSelectionSchema>;
type ProviderTraceId = z.infer<typeof ProviderTraceIdSchema>;
type ProviderPayment = z.infer<typeof ProviderPaymentSchema>;

function toCurrencyAmount(amount: ProviderCurrencyAmount): z.infer<typeof CurrencyAmountSchema> {
    return {
        amount: amount.amount,
        currency_code: amount.currency_code,
        ...(amount.minor_unit_conversion_rate != null && { minor_unit_conversion_rate: amount.minor_unit_conversion_rate })
    };
}

function toAccountingFieldSelection(selection: ProviderAccountingFieldSelection): z.infer<typeof AccountingFieldSelectionSchema> {
    return {
        id: selection.id,
        name: selection.name,
        external_id: selection.external_id,
        ...(selection.external_code != null && { external_code: selection.external_code }),
        ...(selection.display_name != null && { display_name: selection.display_name }),
        ...(selection.provider_name != null && { provider_name: selection.provider_name }),
        ...(selection.category_info != null && { category_info: selection.category_info })
    };
}

function toTraceId(traceId: ProviderTraceId): z.infer<typeof TraceIdSchema> {
    return {
        ...(traceId.trace_id != null && { trace_id: traceId.trace_id }),
        ...(traceId.descriptor != null && { descriptor: traceId.descriptor })
    };
}

function toPayment(payment: ProviderPayment): z.infer<typeof PaymentSchema> {
    const details = payment.details;
    return {
        amount: toCurrencyAmount(payment.amount),
        ...(payment.id != null && { id: payment.id }),
        ...(payment.payment_method != null && { payment_method: payment.payment_method }),
        ...(payment.payment_date != null && { payment_date: payment.payment_date }),
        ...(payment.effective_date != null && { effective_date: payment.effective_date }),
        ...(payment.customer_friendly_payment_id != null && { customer_friendly_payment_id: payment.customer_friendly_payment_id }),
        ...(payment.trace_id != null && { trace_id: toTraceId(payment.trace_id) }),
        ...(payment.bank_debit_trace_id != null && { bank_debit_trace_id: toTraceId(payment.bank_debit_trace_id) }),
        ...(details != null && {
            details: {
                ...(details.schema_type != null && { schema_type: details.schema_type }),
                ...(details.source_bank_account_id != null && { source_bank_account_id: details.source_bank_account_id }),
                ...(details.vendor_account_id != null && { vendor_account_id: details.vendor_account_id }),
                ...(details.approval_status != null && { approval_status: details.approval_status }),
                ...(details.is_same_day != null && { is_same_day: details.is_same_day }),
                ...(details.fund_id != null && { fund_id: details.fund_id }),
                ...(details.transaction_ids != null && { transaction_ids: details.transaction_ids }),
                ...(details.manual_payment_method != null && { manual_payment_method: details.manual_payment_method })
            }
        })
    };
}

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

        const bill = ProviderBillSchema.parse(response.data);

        return {
            id: bill.id,
            status: bill.status,
            status_summary: bill.status_summary,
            sync_status: bill.sync_status,
            amount: toCurrencyAmount(bill.amount),
            issued_at: bill.issued_at,
            due_at: bill.due_at,
            accounting_date: bill.accounting_date,
            created_at: bill.created_at,
            entity_id: bill.entity_id,
            item_receipt_ids: bill.item_receipt_ids,
            is_payment_sync_ready: bill.is_payment_sync_ready,
            fx_conversion_rate: bill.fx_conversion_rate,
            bill_owner: {
                id: bill.bill_owner.id,
                ...(bill.bill_owner.first_name != null && { first_name: bill.bill_owner.first_name }),
                ...(bill.bill_owner.last_name != null && { last_name: bill.bill_owner.last_name })
            },
            vendor: {
                id: bill.vendor.id,
                name: bill.vendor.name,
                ...(bill.vendor.type != null && { type: bill.vendor.type }),
                ...(bill.vendor.remote_code != null && { remote_code: bill.vendor.remote_code }),
                ...(bill.vendor.remote_id != null && { remote_id: bill.vendor.remote_id }),
                ...(bill.vendor.remote_name != null && { remote_name: bill.vendor.remote_name })
            },
            line_items: bill.line_items.map((item) => ({
                id: item.id,
                amount: toCurrencyAmount(item.amount),
                item_receipt_line_item_ids: item.item_receipt_line_item_ids,
                accounting_field_selections: item.accounting_field_selections.map(toAccountingFieldSelection),
                ...(item.memo != null && { memo: item.memo }),
                ...(item.posting_gl_account != null && { posting_gl_account: item.posting_gl_account }),
                ...(item.purchase_order_line_item_id != null && { purchase_order_line_item_id: item.purchase_order_line_item_id })
            })),
            inventory_line_items: bill.inventory_line_items.map((item) => ({
                id: item.id,
                amount: toCurrencyAmount(item.amount),
                unit_price: toCurrencyAmount(item.unit_price),
                quantity: item.quantity,
                item_receipt_line_item_ids: item.item_receipt_line_item_ids,
                accounting_field_selections: item.accounting_field_selections.map(toAccountingFieldSelection),
                ...(item.memo != null && { memo: item.memo }),
                ...(item.purchase_order_line_item_id != null && { purchase_order_line_item_id: item.purchase_order_line_item_id })
            })),
            accounting_field_selections: bill.accounting_field_selections.map(toAccountingFieldSelection),
            applied_vendor_credits: bill.applied_vendor_credits.map((credit) => ({ id: credit.id, amount: toCurrencyAmount(credit.amount) })),
            attachments: bill.attachments,
            invoice_urls: bill.invoice_urls,
            ...(bill.invoice_number != null && { invoice_number: bill.invoice_number }),
            ...(bill.remote_id != null && { remote_id: bill.remote_id }),
            ...(bill.approval_status != null && { approval_status: bill.approval_status }),
            ...(bill.memo != null && { memo: bill.memo }),
            ...(bill.vendor_memo != null && { vendor_memo: bill.vendor_memo }),
            ...(bill.paid_at != null && { paid_at: bill.paid_at }),
            ...(bill.posting_date != null && { posting_date: bill.posting_date }),
            ...(bill.draft_bill_created_at != null && { draft_bill_created_at: bill.draft_bill_created_at }),
            ...(bill.draft_bill_id != null && { draft_bill_id: bill.draft_bill_id }),
            ...(bill.archived_at != null && { archived_at: bill.archived_at }),
            ...(bill.vendor_contact_id != null && { vendor_contact_id: bill.vendor_contact_id }),
            ...(bill.purchase_order_id != null && { purchase_order_id: bill.purchase_order_id }),
            ...(bill.purchase_order_ids != null && { purchase_order_ids: bill.purchase_order_ids }),
            ...(bill.enable_accounting_sync != null && { enable_accounting_sync: bill.enable_accounting_sync }),
            ...(bill.deep_link_url != null && { deep_link_url: bill.deep_link_url }),
            ...(bill.related_bills != null && {
                related_bills: bill.related_bills.map((related) => ({
                    bill_id: related.bill_id,
                    label: related.label,
                    status: related.status,
                    ...(related.amount != null && { amount: toCurrencyAmount(related.amount) }),
                    ...(related.invoice_number != null && { invoice_number: related.invoice_number }),
                    ...(related.vendor_name != null && { vendor_name: related.vendor_name })
                }))
            }),
            ...(bill.payment != null && { payment: toPayment(bill.payment) }),
            ...(bill.payments != null && { payments: bill.payments.map(toPayment) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
