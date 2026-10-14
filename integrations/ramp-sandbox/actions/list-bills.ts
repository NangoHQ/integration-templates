import { z } from 'zod';
import { createAction } from 'nango';

const CurrencyAmountSchema = z
    .object({
        amount: z.number().describe('Amount in the smallest denomination of the currency (e.g. cents for USD).'),
        currency_code: z.string().describe('ISO 4217 currency code. Example: "USD".'),
        minor_unit_conversion_rate: z.number().nullable().describe('Factor converting the integer amount to the major unit (e.g. 100 for USD).')
    })
    .describe('Monetary amount expressed in minor units.');

const AccountingFieldSchema = z
    .object({
        id: z.string().describe('Unique identifier of the accounting category/field.'),
        name: z.string().describe('Name of the accounting category/field.'),
        type: z.string().describe('Type of the accounting field. Example: "GL_ACCOUNT".'),
        external_id: z.string().describe('External identifier of the accounting field in the ERP.')
    })
    .describe('Accounting category information for a coded field selection.');

const AccountingFieldSelectionSchema = z
    .object({
        id: z.string().describe('Unique identifier of the accounting field option within Ramp.'),
        name: z.string().describe('Name of the accounting field option.'),
        display_name: z.string().nullable().describe('Customer-set display name for the accounting field option.'),
        external_id: z.string().describe('External identifier of the accounting field option.'),
        external_code: z.string().nullable().describe('External code of the accounting field option.'),
        provider_name: z.string().nullable().describe('Name of the accounting provider.'),
        category_info: AccountingFieldSchema.nullable().describe('Information about the accounting category/field.')
    })
    .describe('An accounting field option selected to code a bill or line item.');

const AttachmentSchema = z
    .object({
        id: z.string().describe('Unique identifier of the bill attachment.'),
        attachment_type: z.string().describe('Type of attachment. Example: "INVOICE".'),
        url: z.string().describe('Pre-signed URL to download the attachment.')
    })
    .describe('Business-visible bill attachment with its download URL.');

const VendorSchema = z
    .object({
        id: z.string().describe('Unique identifier of the vendor.'),
        name: z.string().describe('Name of the vendor.'),
        type: z.string().nullable().describe('Vendor type. Example: "BUSINESS".'),
        remote_id: z.string().nullish().describe('External ID that identifies the vendor on the client side.'),
        remote_code: z.string().nullish().describe('Code of the vendor in the ERP.'),
        remote_name: z.string().nullish().describe('Name of the vendor in the ERP.')
    })
    .describe('Vendor associated with the bill.');

const BillOwnerSchema = z
    .object({
        id: z.string().describe('Unique identifier of the bill owner.'),
        first_name: z.string().nullable().describe('Bill owner first name.'),
        last_name: z.string().nullable().describe('Bill owner last name.')
    })
    .describe('User who owns the bill.');

const TraceIdSchema = z
    .object({
        descriptor: z.string().nullable().describe('Human-readable description of the trace ID.'),
        trace_id: z.string().nullable().describe('Provider trace/reference ID for the payment.')
    })
    .describe('Payment trace identifier.');

const PaymentSchema = z
    .object({
        id: z.string().nullable().describe('Unique identifier of the payment.'),
        amount: CurrencyAmountSchema.nullable().describe('Paid amount of the bill.'),
        customer_friendly_payment_id: z.string().nullable().describe('Customer-friendly payment identifier for non-card payments.'),
        effective_date: z.string().nullable().describe('Date the payment takes effect for non-card payment methods.'),
        payment_date: z.string().nullable().describe('Scheduled initiation date for the payment.'),
        payment_method: z.string().nullable().describe('Payment method. Example: "ACH".'),
        trace_id: TraceIdSchema.nullable().describe('Trace ID for the payment.'),
        bank_debit_trace_id: TraceIdSchema.nullish().describe('Bank-facing trace ID for the business bank debit.'),
        details: z.record(z.string(), z.unknown()).nullable().describe('Additional payment details specific to the payment method.')
    })
    .describe('Payment information for the bill.');

const LineItemSchema = z
    .object({
        id: z.string().describe('Unique identifier of the line item.'),
        amount: CurrencyAmountSchema.nullable().describe('Amount of the line item in minor units.'),
        memo: z.string().nullable().describe('Memo of the line item.'),
        purchase_order_line_item_id: z.string().nullable().describe('Matched purchase order line item identifier, if any.'),
        accounting_field_selections: z.array(AccountingFieldSelectionSchema).describe('Accounting field options selected to code the line item.'),
        item_receipt_line_item_ids: z.array(z.string()).describe('Item receipt line item identifiers associated with the line item.'),
        withholding_line_item: z.record(z.string(), z.unknown()).nullish().describe('Retainage withholding details, if applicable.')
    })
    .describe('A bill line item.');

const InventoryLineItemSchema = z
    .object({
        id: z.string().describe('Unique identifier of the inventory line item.'),
        amount: CurrencyAmountSchema.nullable().describe('Amount of the inventory line item in minor units.'),
        unit_price: CurrencyAmountSchema.nullable().describe('Unit price of the inventory line item in minor units.'),
        quantity: z.number().nullable().describe('Quantity of the inventory line item.'),
        memo: z.string().nullable().describe('Memo of the inventory line item.'),
        purchase_order_line_item_id: z.string().nullable().describe('Matched purchase order line item identifier, if any.'),
        accounting_field_selections: z.array(AccountingFieldSelectionSchema).describe('Accounting field options selected to code the inventory line item.'),
        item_receipt_line_item_ids: z.array(z.string()).describe('Item receipt line item identifiers associated with the inventory line item.'),
        withholding_line_item: z.record(z.string(), z.unknown()).nullish().describe('Retainage withholding details, if applicable.')
    })
    .describe('An inventory line item on the bill.');

const AppliedVendorCreditSchema = z
    .object({
        id: z.string().describe('Unique identifier of the applied vendor credit.'),
        amount: CurrencyAmountSchema.nullable().describe('Amount of the applied vendor credit in minor units.')
    })
    .describe('A vendor credit applied to the bill.');

const RelatedBillSchema = z
    .object({
        bill_id: z.string().describe('Identifier of the related bill.'),
        label: z.string().describe('Label describing the relationship from this bill to the related bill.'),
        status: z.string().describe('Status of the related bill.'),
        amount: CurrencyAmountSchema.nullable().describe('Amount of the related bill in minor units.'),
        invoice_number: z.string().nullable().describe('Invoice number of the related bill.'),
        vendor_name: z.string().nullable().describe('Vendor name of the related bill.')
    })
    .describe('A bill associated with this bill.');

const BillSchema = z
    .object({
        id: z.string().describe('Unique identifier of the bill.'),
        invoice_number: z.string().nullish().describe('Invoice number on the bill.'),
        amount: CurrencyAmountSchema.describe('Total amount of the bill in minor units.'),
        status: z.string().describe('Coarse bill status. Example: "OPEN", "PAID".'),
        status_summary: z.string().describe('Finer-grained bill status summary. Example: "PAYMENT_COMPLETED".'),
        approval_status: z.string().nullable().describe('Bill approval status. Example: "APPROVED".'),
        sync_status: z.string().describe('Accounting/ERP sync status. Example: "NOT_SYNCED".'),
        vendor: VendorSchema.describe('Vendor associated with the bill.'),
        bill_owner: BillOwnerSchema.describe('User who owns the bill.'),
        entity_id: z.string().describe('Identifier of the business entity the bill belongs to.'),
        line_items: z.array(LineItemSchema).describe('Line items on the bill.'),
        inventory_line_items: z.array(InventoryLineItemSchema).describe('Inventory line items on the bill.'),
        accounting_field_selections: z.array(AccountingFieldSelectionSchema).describe('Accounting field options selected to code the bill.'),
        applied_vendor_credits: z.array(AppliedVendorCreditSchema).describe('Vendor credits applied to the bill.'),
        related_bills: z.array(RelatedBillSchema).nullish().describe('Bills associated with this bill.'),
        attachments: z.array(AttachmentSchema).describe('Business-visible bill attachments with download URLs.'),
        invoice_urls: z.array(z.string()).describe('Pre-signed URLs for the bill attachments.'),
        item_receipt_ids: z.array(z.string()).describe('Item receipt identifiers associated with the bill.'),
        payment: PaymentSchema.nullable().describe('Payment information for the bill.'),
        purchase_order_id: z.string().nullish().describe('Matched purchase order identifier, if any.'),
        purchase_order_ids: z.array(z.string()).nullish().describe('Identifiers of purchase orders matched to the bill.'),
        vendor_contact_id: z.string().nullable().describe('Identifier of the associated vendor contact.'),
        draft_bill_id: z.string().nullable().describe('Identifier of the draft bill this bill was created from, if any.'),
        draft_bill_created_at: z.string().nullable().describe('Date the source draft bill was created, if any.'),
        created_at: z.string().describe('Date the bill was created.'),
        issued_at: z.string().describe('Date the bill was issued on the invoice.'),
        due_at: z.string().describe('Date the bill is due.'),
        paid_at: z.string().nullish().describe('Date the bill was paid, if paid.'),
        accounting_date: z.string().describe('Date used for accounting purposes.'),
        posting_date: z.string().nullish().describe('Date the bill was posted to the ERP.'),
        archived_at: z.string().nullable().describe('Date the bill was archived, if archived.'),
        deep_link_url: z.string().nullish().describe('Deep link to the bill in the ERP, if available.'),
        remote_id: z.string().nullish().describe('External identifier of the bill on the client side.'),
        memo: z.string().nullish().describe('Memo of the bill.'),
        vendor_memo: z.string().nullish().describe('Memo to the vendor.'),
        fx_conversion_rate: z.string().nullish().describe('FX conversion rate from invoice currency to payer currency.'),
        enable_accounting_sync: z.boolean().nullish().describe('Whether the bill should sync to the ERP.'),
        is_payment_sync_ready: z.boolean().nullish().describe('Whether the bill is ready for payment accounting export.'),
        is_withholding_release: z.boolean().nullish().describe('Whether this bill is a retainage withholding release bill.')
    })
    .describe('A Bill Pay bill.');

const StatusSummarySchema = z.enum([
    'APPROVAL_PENDING',
    'APPROVAL_REJECTED',
    'ARCHIVED',
    'AWAITING_PAYMENT',
    'AWAITING_RELEASE',
    'BLOCKED',
    'HELD_BY_PROVIDER',
    'ON_HOLD',
    'PAYMENT_COMPLETED',
    'PAYMENT_DETAILS_MISSING',
    'PAYMENT_ERROR',
    'PAYMENT_NOT_INSTRUCTED',
    'PAYMENT_PROCESSING',
    'PAYMENT_READY',
    'PAYMENT_SCHEDULED',
    'PENDING_VENDOR_APPROVAL',
    'WAITING_FOR_TRANSACTION_MATCH',
    'WAITING_FOR_TRANSFER_MATCH',
    'WAITING_FOR_VENDOR'
]);

const InputSchema = z
    .object({
        cursor: z
            .string()
            .url()
            .optional()
            .describe(
                'Opaque next-page cursor (the full next_cursor URL from a previous response). When provided, all other filters are ignored because the cursor already encodes them.'
            ),
        page_size: z.number().int().min(2).max(100).optional().describe('Number of bills to return per page (2-100). Defaults to 20.'),
        status_summaries: z.array(StatusSummarySchema).optional().describe('Return only bills with one or more of these status summaries.'),
        approval_status: z
            .enum(['APPROVED', 'INITIALIZED', 'PENDING', 'REJECTED', 'TERMINATED'])
            .optional()
            .describe('Return only bills with this approval status.'),
        payment_status: z.enum(['OPEN', 'PAID']).optional().describe('Return only bills with this payment status.'),
        payment_method: z
            .enum([
                'ACH',
                'CARD',
                'CHECK',
                'CRYPTO_WALLET_TRANSFER',
                'DOMESTIC_WIRE',
                'INTERNATIONAL',
                'LOCAL_BANK_TRANSFER',
                'ONE_TIME_CARD',
                'ONE_TIME_CARD_DELIVERY',
                'PAID_MANUALLY',
                'SWIFT'
            ])
            .optional()
            .describe('Return only bills paid with this payment method.'),
        sync_status: z.enum(['BILL_AND_PAYMENT_SYNCED', 'BILL_SYNCED', 'NOT_SYNCED']).optional().describe('Return only bills with this ERP sync status.'),
        is_archived: z.boolean().optional().describe('Return archived (deleted) bills instead of active bills. Defaults to false.'),
        is_accounting_sync_enabled: z.boolean().optional().describe('Filter by whether the bill is configured to sync to the ERP.'),
        is_payment_sync_ready: z.boolean().optional().describe('Filter by payment accounting export readiness.'),
        payment_details_missing: z.boolean().optional().describe('Return only bills missing payment details (e.g. vendor bank account, payment method).'),
        sync_ready: z.boolean().optional().describe('Return only bills that are ready to sync to the ERP.'),
        vendor_id: z.string().optional().describe('Filter bills by vendor identifier.'),
        entity_id: z.string().optional().describe('Filter bills by business entity identifier.'),
        purchase_order_id: z.string().optional().describe('Filter bills by matched purchase order identifier.'),
        payment_id: z.string().optional().describe('Filter bills by payment identifier.'),
        customer_friendly_payment_id: z.string().optional().describe('Filter bills by customer-friendly payment ID.'),
        draft_bill_id: z.string().optional().describe('Filter bills by source draft bill identifier.'),
        invoice_number: z.string().optional().describe('Filter bills by exact invoice number.'),
        remote_id: z.string().optional().describe('Filter bills by exact remote/ERP identifier.'),
        accounting_field_selection_id: z.string().optional().describe('Filter bills coded with this accounting field selection.'),
        min_amount: z.union([z.number(), z.string()]).optional().describe('Return only bills with an amount greater than or equal to this value.'),
        max_amount: z.union([z.number(), z.string()]).optional().describe('Return only bills with an amount less than or equal to this value.'),
        from_created_at: z.string().optional().describe('Return only bills created on or after this ISO-8601 datetime. Example: "2026-10-01T00:00:00Z".'),
        to_created_at: z.string().optional().describe('Return only bills created on or before this ISO-8601 datetime. Example: "2026-10-31T23:59:59Z".'),
        from_due_date: z.string().optional().describe('Return only bills due on or after this ISO-8601 datetime.'),
        to_due_date: z.string().optional().describe('Return only bills due on or before this ISO-8601 datetime.'),
        from_issued_date: z.string().optional().describe('Return only bills issued on or after this ISO-8601 datetime.'),
        to_issued_date: z.string().optional().describe('Return only bills issued on or before this ISO-8601 datetime.'),
        from_paid_at: z.string().optional().describe('Return only bills paid on or after this ISO-8601 datetime.'),
        to_paid_at: z.string().optional().describe('Return only bills paid on or before this ISO-8601 datetime.'),
        from_payment_date: z.string().optional().describe('Return only bills with a payment date on or after this ISO-8601 datetime.'),
        to_payment_date: z.string().optional().describe('Return only bills with a payment date on or before this ISO-8601 datetime.')
    })
    .describe('Filters and pagination cursor for listing Bill Pay bills.');

const PaginatedBillsSchema = z.object({
    data: z.array(BillSchema),
    page: z
        .object({
            next: z.string().nullable()
        })
        .optional()
});

const OutputSchema = z
    .object({
        bills: z.array(BillSchema).describe('Bills matching the requested filters.'),
        next_cursor: z
            .string()
            .optional()
            .describe(
                'Opaque cursor URL for the next page. Omit (or null) when there are no more pages; pass it back as the cursor input to fetch the next page.'
            )
    })
    .describe('A page of Bill Pay bills with an optional cursor for the next page.');

/**
 * @tags: [read]
 * @tagReason: Reads Bill Pay bills from the provider's list endpoint and performs no provider mutations.
 * @pitfalls: Date-range filters require a full ISO-8601 datetime (a bare date fails with HTTP 422); amounts are returned in minor units (e.g. cents); when a cursor is supplied all other filter inputs are ignored because the cursor already encodes the original filters; is_archived defaults to false so only active bills are returned.
 */
const action = createAction({
    description: 'List Bill Pay bills with extensive filtering.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params = {
            ...(input.page_size !== undefined && { page_size: input.page_size }),
            ...(input.status_summaries !== undefined && { status_summaries: input.status_summaries.join(',') }),
            ...(input.approval_status !== undefined && { approval_status: input.approval_status }),
            ...(input.payment_status !== undefined && { payment_status: input.payment_status }),
            ...(input.payment_method !== undefined && { payment_method: input.payment_method }),
            ...(input.sync_status !== undefined && { sync_status: input.sync_status }),
            ...(input.is_archived !== undefined && { is_archived: String(input.is_archived) }),
            ...(input.is_accounting_sync_enabled !== undefined && { is_accounting_sync_enabled: String(input.is_accounting_sync_enabled) }),
            ...(input.is_payment_sync_ready !== undefined && { is_payment_sync_ready: String(input.is_payment_sync_ready) }),
            ...(input.payment_details_missing !== undefined && { payment_details_missing: String(input.payment_details_missing) }),
            ...(input.sync_ready !== undefined && { sync_ready: String(input.sync_ready) }),
            ...(input.vendor_id !== undefined && { vendor_id: input.vendor_id }),
            ...(input.entity_id !== undefined && { entity_id: input.entity_id }),
            ...(input.purchase_order_id !== undefined && { purchase_order_id: input.purchase_order_id }),
            ...(input.payment_id !== undefined && { payment_id: input.payment_id }),
            ...(input.customer_friendly_payment_id !== undefined && { customer_friendly_payment_id: input.customer_friendly_payment_id }),
            ...(input.draft_bill_id !== undefined && { draft_bill_id: input.draft_bill_id }),
            ...(input.invoice_number !== undefined && { invoice_number: input.invoice_number }),
            ...(input.remote_id !== undefined && { remote_id: input.remote_id }),
            ...(input.accounting_field_selection_id !== undefined && { accounting_field_selection_id: input.accounting_field_selection_id }),
            ...(input.min_amount !== undefined && { min_amount: input.min_amount }),
            ...(input.max_amount !== undefined && { max_amount: input.max_amount }),
            ...(input.from_created_at !== undefined && { from_created_at: input.from_created_at }),
            ...(input.to_created_at !== undefined && { to_created_at: input.to_created_at }),
            ...(input.from_due_date !== undefined && { from_due_date: input.from_due_date }),
            ...(input.to_due_date !== undefined && { to_due_date: input.to_due_date }),
            ...(input.from_issued_date !== undefined && { from_issued_date: input.from_issued_date }),
            ...(input.to_issued_date !== undefined && { to_issued_date: input.to_issued_date }),
            ...(input.from_paid_at !== undefined && { from_paid_at: input.from_paid_at }),
            ...(input.to_paid_at !== undefined && { to_paid_at: input.to_paid_at }),
            ...(input.from_payment_date !== undefined && { from_payment_date: input.from_payment_date }),
            ...(input.to_payment_date !== undefined && { to_payment_date: input.to_payment_date })
        };

        // A cursor is the full next-page URL returned by the provider. Reuse its path and query
        // (which already carry the original filters) against the configured provider host.
        const endpoint = input.cursor ? `${new URL(input.cursor).pathname}${new URL(input.cursor).search}` : '/developer/v1/bills';

        const response = await nango.get({
            // https://docs.ramp.com/openapi/developer-api.json (GET /developer/v1/bills)
            endpoint,
            params: input.cursor ? {} : params,
            retries: 3
        });

        const parsed = PaginatedBillsSchema.parse(response.data);

        return {
            bills: parsed.data,
            ...(parsed.page?.next != null && { next_cursor: parsed.page.next })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
