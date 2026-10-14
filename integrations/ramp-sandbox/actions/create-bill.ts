import { z } from 'zod';
import { createAction } from 'nango';

const AccountingFieldSelectionSchema = z.object({
    field_external_id: z.string().describe('External ID of the accounting field to code, from the ERP.'),
    field_option_external_id: z
        .string()
        .nullable()
        .optional()
        .describe('External ID of the accounting field option to select. Provide this or free_form_text.'),
    free_form_text: z.string().nullable().optional().describe('Free-form text value for the accounting field. Provide this or field_option_external_id.')
});

const LineItemSchema = z.object({
    amount: z.number().describe('Line item amount in major currency units, e.g. 10.5 for $10.50.'),
    memo: z.string().nullable().optional().describe('Optional memo describing the line item.'),
    accounting_field_selections: z.array(AccountingFieldSelectionSchema).optional().describe('Accounting field options that code this line item.')
});

const InputSchema = z
    .object({
        entity_id: z.string().describe('ID of the business entity the bill belongs to. Example: "1cc4b57c-fe4a-4425-90f1-9019d06376b3".'),
        vendor_id: z.string().describe('ID of the vendor the bill is owed to. Example: "c0c89fa8-976e-428d-938d-a5ec89838474".'),
        due_at: z.string().describe('Payment due date in YYYY-MM-DD format. Example: "2024-10-15".'),
        invoice_number: z.string().describe('Invoice number for the bill.'),
        issued_at: z.string().describe('Date the invoice was issued in YYYY-MM-DD format. Example: "2024-08-15".'),
        invoice_currency: z.string().describe('ISO 4217 currency code of the invoice, e.g. "USD".'),
        line_items: z.array(LineItemSchema).optional().describe('Line items that make up the bill.'),
        accounting_field_selections: z.array(AccountingFieldSelectionSchema).optional().describe('Accounting field options that code the whole bill.'),
        enable_accounting_sync: z.boolean().optional().describe('Whether the bill should sync to the connected ERP. Must be true when remote_id is provided.'),
        memo: z.string().nullable().optional().describe('Internal memo for the bill.'),
        vendor_memo: z.string().nullable().optional().describe('Memo shown to the vendor.'),
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
            .describe('How the bill is paid. Required unless use_default_payment_method is true.'),
        use_default_payment_method: z.boolean().optional().describe('Use the payment method configured on the vendor instead of passing payment_method.'),
        use_default_vendor_contact: z.boolean().optional().describe("Use the vendor's default contact instead of passing vendor_contact_id."),
        vendor_contact_id: z
            .string()
            .nullable()
            .optional()
            .describe('ID of the vendor contact for this bill. Required unless use_default_vendor_contact is true.'),
        remote_id: z.string().nullable().optional().describe('Caller-side identifier for the bill in the connected accounting system.')
    })
    .describe('Input for creating a Ramp bill directly, with optional line items and payment settings.');

const CurrencyAmountSchema = z.object({
    amount: z.number(),
    currency_code: z.string(),
    minor_unit_conversion_rate: z.number().nullable().optional()
});

const ProviderVendorSchema = z.object({
    id: z.string(),
    name: z.string()
});

const ProviderLineItemSchema = z.object({
    id: z.string(),
    amount: CurrencyAmountSchema,
    memo: z.string().nullable().optional()
});

const ProviderPaymentSchema = z.object({
    payment_method: z.string().nullable().optional()
});

const ProviderBillSchema = z.object({
    id: z.string(),
    invoice_number: z.string(),
    entity_id: z.string(),
    vendor: ProviderVendorSchema,
    amount: CurrencyAmountSchema,
    status: z.string(),
    status_summary: z.string(),
    approval_status: z.string().nullable().optional(),
    sync_status: z.string().optional(),
    due_at: z.string(),
    issued_at: z.string(),
    created_at: z.string().optional(),
    enable_accounting_sync: z.boolean().optional(),
    memo: z.string().nullable().optional(),
    vendor_memo: z.string().nullable().optional(),
    deep_link_url: z.string().nullable().optional(),
    line_items: z.array(ProviderLineItemSchema).optional(),
    payment: ProviderPaymentSchema.nullable().optional()
});

const OutputLineItemSchema = z.object({
    id: z.string().describe('Unique identifier of the bill line item.'),
    amount: z.number().describe('Line item amount in the smallest denomination of the currency, e.g. cents for USD.'),
    currency_code: z.string().describe('ISO 4217 currency code of the line item amount.'),
    memo: z.string().optional().describe('Memo of the line item.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the created bill.'),
        invoice_number: z.string().describe('Invoice number of the created bill.'),
        entity_id: z.string().describe('ID of the business entity the bill belongs to.'),
        vendor_id: z.string().describe('ID of the vendor the bill is owed to.'),
        vendor_name: z.string().describe('Name of the vendor the bill is owed to.'),
        amount: z.number().describe('Total bill amount in the smallest denomination of the currency, e.g. cents for USD.'),
        currency_code: z.string().describe('ISO 4217 currency code of the bill amount.'),
        status: z.string().describe('Bill payment status, either "OPEN" or "PAID".'),
        status_summary: z.string().describe('Detailed status summary of the bill, e.g. "APPROVAL_PENDING" or "PAYMENT_SCHEDULED".'),
        approval_status: z.string().optional().describe('Approval status of the bill, e.g. "APPROVED" or "PENDING".'),
        sync_status: z.string().optional().describe('Accounting sync status, e.g. "NOT_SYNCED" or "BILL_SYNCED".'),
        payment_method: z.string().optional().describe('Payment method chosen for the bill, e.g. "ACH" or "CARD".'),
        due_at: z.string().describe('Payment due date of the bill.'),
        issued_at: z.string().describe('Date the invoice was issued.'),
        created_at: z.string().optional().describe('Timestamp when the bill was created.'),
        enable_accounting_sync: z.boolean().optional().describe('Whether the bill is configured to sync to the connected ERP.'),
        memo: z.string().optional().describe('Internal memo of the bill.'),
        vendor_memo: z.string().optional().describe('Memo shown to the vendor.'),
        deep_link_url: z.string().optional().describe('Link to the bill in the ERP, if one exists.'),
        line_items: z.array(OutputLineItemSchema).optional().describe('Line items that make up the bill.')
    })
    .describe('The bill created in Ramp.');

/**
 * @tags: [write]
 * @tagReason: Creates a new provider-side bill via POST /bills; it reads no existing resource and is not a delete, revocation, or other hard-to-reverse effect.
 * @pitfalls: Line-item amount is supplied in major currency units (e.g. 10.5 for $10.50) while all returned amounts are in minor units (cents); the request is rejected unless either payment_method or use_default_payment_method=true is set and either vendor_contact_id or use_default_vendor_contact=true is set; remote_id requires enable_accounting_sync=true; and created bills are auto-approved and can immediately schedule a real payment using the vendor's default method.
 */
const action = createAction({
    description: 'Create a bill directly (not via the draft flow) with line items.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data = {
            entity_id: input.entity_id,
            vendor_id: input.vendor_id,
            due_at: input.due_at,
            invoice_number: input.invoice_number,
            issued_at: input.issued_at,
            invoice_currency: input.invoice_currency,
            ...(input.line_items !== undefined && { line_items: input.line_items }),
            ...(input.accounting_field_selections !== undefined && { accounting_field_selections: input.accounting_field_selections }),
            ...(input.enable_accounting_sync !== undefined && { enable_accounting_sync: input.enable_accounting_sync }),
            ...(input.memo !== undefined && { memo: input.memo }),
            ...(input.vendor_memo !== undefined && { vendor_memo: input.vendor_memo }),
            ...(input.payment_method !== undefined && { payment_method: input.payment_method }),
            ...(input.use_default_payment_method !== undefined && { use_default_payment_method: input.use_default_payment_method }),
            ...(input.use_default_vendor_contact !== undefined && { use_default_vendor_contact: input.use_default_vendor_contact }),
            ...(input.vendor_contact_id !== undefined && { vendor_contact_id: input.vendor_contact_id }),
            ...(input.remote_id !== undefined && { remote_id: input.remote_id })
        };

        const response = await nango.post({
            // https://docs.ramp.com/developer-api/v1/bill-payments
            endpoint: '/developer/v1/bills',
            data,
            // Ramp does not dedupe POST /bills (no working idempotency key, verified live), so a retry after a lost response would create a duplicate bill.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const bill = ProviderBillSchema.parse(response.data);

        return {
            id: bill.id,
            invoice_number: bill.invoice_number,
            entity_id: bill.entity_id,
            vendor_id: bill.vendor.id,
            vendor_name: bill.vendor.name,
            amount: bill.amount.amount,
            currency_code: bill.amount.currency_code,
            status: bill.status,
            status_summary: bill.status_summary,
            ...(bill.approval_status != null && { approval_status: bill.approval_status }),
            ...(bill.sync_status != null && { sync_status: bill.sync_status }),
            ...(bill.payment?.payment_method != null && { payment_method: bill.payment.payment_method }),
            due_at: bill.due_at,
            issued_at: bill.issued_at,
            ...(bill.created_at != null && { created_at: bill.created_at }),
            ...(bill.enable_accounting_sync != null && { enable_accounting_sync: bill.enable_accounting_sync }),
            ...(bill.memo != null && { memo: bill.memo }),
            ...(bill.vendor_memo != null && { vendor_memo: bill.vendor_memo }),
            ...(bill.deep_link_url != null && { deep_link_url: bill.deep_link_url }),
            ...(bill.line_items != null && {
                line_items: bill.line_items.map((item) => ({
                    id: item.id,
                    amount: item.amount.amount,
                    currency_code: item.amount.currency_code,
                    ...(item.memo != null && { memo: item.memo })
                }))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
