import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const PaymentMethodSchema = z.enum([
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
]);

const AccountingFieldSelectionInputSchema = z.object({
    field_external_id: z.string().describe('External ID of the accounting field, typically sourced from the ERP.'),
    field_option_external_id: z
        .string()
        .nullable()
        .optional()
        .describe('External ID of the accounting field option. Required when free_form_text is not provided.'),
    free_form_text: z
        .string()
        .nullable()
        .optional()
        .describe('Free-form value for the accounting field, used instead of field_option_external_id. For DATE fields use YYYY-MM-DD.')
});

const LineItemInputSchema = z.object({
    amount: z.union([z.number(), z.string()]).describe('Line item amount in major currency units, e.g. dollars. Example: 100'),
    memo: z.string().nullable().optional().describe('Memo for the line item. Send null to clear it.'),
    accounting_field_selections: z.array(AccountingFieldSelectionInputSchema).optional().describe('Accounting field options that code this line item.')
});

const InventoryLineItemInputSchema = z.object({
    quantity: z.union([z.number(), z.string()]).describe('Quantity of the inventory line item. Example: 2'),
    unit_price: z.union([z.number(), z.string()]).describe('Unit price in major currency units, e.g. dollars. Example: 55'),
    memo: z.string().nullable().optional().describe('Memo for the inventory line item. Send null to clear it.'),
    accounting_field_selections: z
        .array(AccountingFieldSelectionInputSchema)
        .optional()
        .describe('Accounting field options that code this inventory line item.')
});

const InputSchema = z
    .object({
        vendor_id: z.string().describe('Unique identifier of the bill vendor. Example: "c0c89fa8-976e-428d-938d-a5ec89838474"'),
        due_at: z.string().optional().describe('Due date of the bill in YYYY-MM-DD format. Example: "2024-10-15"'),
        entity_id: z.string().optional().describe('Identifier of the business entity the bill belongs to. Example: "1cc4b57c-fe4a-4425-90f1-9019d06376b3"'),
        invoice_currency: z.string().optional().describe('ISO 4217 currency code of the invoice. Example: "USD"'),
        invoice_number: z.string().optional().describe('Invoice number printed on the bill. Example: "123"'),
        issued_at: z.string().optional().describe('Date the bill was issued, in YYYY-MM-DD format. Example: "2024-08-15"'),
        memo: z.string().nullable().optional().describe('Internal memo for the bill. Send null to clear it.'),
        vendor_memo: z.string().nullable().optional().describe('Memo directed to the vendor. Send null to clear it.'),
        remote_id: z.string().nullable().optional().describe('Caller-side identifier for the bill. Send null to clear it.'),
        posting_date: z
            .string()
            .nullable()
            .optional()
            .describe('Date the bill is posted to the accounting system, in YYYY-MM-DD format. Send null to clear it.'),
        enable_accounting_sync: z.boolean().optional().describe('Set false to prevent this bill from syncing to your ERP.'),
        use_default_payment_method: z.boolean().optional().describe('Set true to use the default payment method configured for the vendor.'),
        payment_method: PaymentMethodSchema.optional().describe('Intended payment method for the bill.'),
        vendor_contact_id: z.string().optional().describe('Identifier of a vendor contact, which must be associated with the given vendor.'),
        purchase_order_ids: z.array(z.string()).optional().describe('Identifiers of purchase orders to match this bill to.'),
        accounting_field_selections: z.array(AccountingFieldSelectionInputSchema).optional().describe('Accounting field options that code the bill.'),
        line_items: z.array(LineItemInputSchema).nullable().optional().describe('Line items for the bill. Send null to clear all line items.'),
        inventory_line_items: z
            .array(InventoryLineItemInputSchema)
            .nullable()
            .optional()
            .describe('Inventory line items for the bill. Send null to clear all inventory line items.')
    })
    .describe('Fields for creating a Ramp draft bill that can be reviewed or edited before submission.');

const CurrencyAmountSchema = z.object({
    amount: z.number().describe('Amount in the lowest denomination of the currency, e.g. cents for USD.'),
    currency_code: z.string().describe('ISO 4217 currency code. Example: "USD"'),
    minor_unit_conversion_rate: z.number().nullable().describe('Factor used to convert the integer amount to the currency value, e.g. 100 for USD.')
});

const BillOwnerSchema = z.object({
    id: z.string().describe('Identifier of the bill owner.'),
    first_name: z.string().optional().describe('Bill owner first name.'),
    last_name: z.string().optional().describe('Bill owner last name.')
});

const BillVendorSchema = z.object({
    id: z.string().describe('Identifier of the vendor.'),
    name: z.string().describe('Name of the vendor.'),
    remote_code: z.string().optional().describe('Vendor code in the connected ERP system.'),
    remote_id: z.string().optional().describe('External identifier of the vendor.'),
    remote_name: z.string().optional().describe('Vendor name in the connected ERP system.'),
    type: z.string().nullable().optional().describe('Vendor type, e.g. "BUSINESS" or "INDIVIDUAL".')
});

const AccountingFieldSelectionSchema = z.object({
    id: z.string().describe('Ramp identifier of the accounting field option.'),
    external_id: z.string().describe('External identifier of the accounting field option.'),
    name: z.string().describe('Name of the accounting field option.'),
    display_name: z.string().nullable().optional().describe('Ramp-side display name for the option, when overridden.'),
    external_code: z.string().nullable().optional().describe('External code of the accounting field option as displayed in the ERP.'),
    provider_name: z.string().nullable().optional().describe('Name of the connected accounting provider.')
});

const DraftBillLineItemSchema = z.object({
    id: z.string().describe('Unique identifier of the line item.'),
    memo: z.string().nullable().optional().describe('Memo of the line item.'),
    amount: CurrencyAmountSchema.nullable().describe('Amount of the line item.'),
    accounting_field_selections: z.array(AccountingFieldSelectionSchema).describe('Accounting field options that code the line item.')
});

const DraftBillInventoryLineItemSchema = z.object({
    id: z.string().describe('Unique identifier of the inventory line item.'),
    memo: z.string().nullable().optional().describe('Memo of the inventory line item.'),
    amount: CurrencyAmountSchema.nullable().describe('Total amount of the inventory line item.'),
    quantity: z.number().nullable().describe('Quantity of the inventory line item.'),
    unit_price: CurrencyAmountSchema.nullable().describe('Unit price of the inventory line item.'),
    accounting_field_selections: z.array(AccountingFieldSelectionSchema).describe('Accounting field options that code the inventory line item.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the created draft bill.'),
        status: z.string().describe('Payment status of the draft bill. Always "DRAFT".'),
        sync_status: z.string().describe('Accounting sync status of the draft bill. Always "NOT_SYNCED".'),
        created_at: z.string().describe('Timestamp when the draft bill was created (ISO 8601).'),
        accounting_date: z.string().nullable().describe('Date used for accounting purposes; falls back to the issue date when unset.'),
        due_at: z.string().nullable().describe('Due date of the bill.'),
        issued_at: z.string().nullable().describe('Date the bill was issued on the invoice.'),
        entity_id: z.string().nullable().describe('Identifier of the associated business entity.'),
        invoice_number: z.string().nullable().describe('Invoice number on the bill.'),
        memo: z.string().nullable().describe('Internal memo of the bill.'),
        vendor_memo: z.string().nullable().describe('Memo directed to the vendor.'),
        remote_id: z.string().nullable().describe('Caller-side identifier of the bill.'),
        posting_date: z.string().nullable().describe('Date the bill was posted to the ERP.'),
        amount: CurrencyAmountSchema.nullable().describe('Total amount of the draft bill.'),
        vendor: BillVendorSchema.nullable().describe('Vendor associated with the draft bill.'),
        bill_owner: BillOwnerSchema.nullable().describe('Owner of the draft bill.'),
        line_items: z.array(DraftBillLineItemSchema).describe('Line items on the draft bill.'),
        inventory_line_items: z.array(DraftBillInventoryLineItemSchema).describe('Inventory line items on the draft bill.'),
        accounting_field_selections: z.array(AccountingFieldSelectionSchema).describe('Accounting field options that code the bill.'),
        invoice_urls: z.array(z.string()).describe('Pre-signed URLs to download the invoice files.')
    })
    .describe('The created Ramp draft bill, including its status, amount, vendor, owner, line items, and accounting coding.');

/**
 * @tags: [write]
 * @tagReason: Creates a new draft bill in Ramp, a provider-side mutation with no read of existing state.
 * @pitfalls: Line item and inventory line item amounts are sent in major units (e.g. dollars) but all amounts in the response come back in minor units (cents); a created draft cannot be deleted through the API, so it persists until it is submitted or removed in the Ramp UI.
 */
const action = createAction({
    description: 'Create a bill in draft state, to be reviewed/edited before submission.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['bills:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {
            vendor_id: input.vendor_id,
            ...(input.due_at !== undefined && { due_at: input.due_at }),
            ...(input.entity_id !== undefined && { entity_id: input.entity_id }),
            ...(input.invoice_currency !== undefined && { invoice_currency: input.invoice_currency }),
            ...(input.invoice_number !== undefined && { invoice_number: input.invoice_number }),
            ...(input.issued_at !== undefined && { issued_at: input.issued_at }),
            ...(input.memo !== undefined && { memo: input.memo }),
            ...(input.vendor_memo !== undefined && { vendor_memo: input.vendor_memo }),
            ...(input.remote_id !== undefined && { remote_id: input.remote_id }),
            ...(input.posting_date !== undefined && { posting_date: input.posting_date }),
            ...(input.enable_accounting_sync !== undefined && { enable_accounting_sync: input.enable_accounting_sync }),
            ...(input.use_default_payment_method !== undefined && { use_default_payment_method: input.use_default_payment_method }),
            ...(input.payment_method !== undefined && { payment_method: input.payment_method }),
            ...(input.vendor_contact_id !== undefined && { vendor_contact_id: input.vendor_contact_id }),
            ...(input.purchase_order_ids !== undefined && { purchase_order_ids: input.purchase_order_ids }),
            ...(input.accounting_field_selections !== undefined && { accounting_field_selections: input.accounting_field_selections }),
            ...(input.line_items !== undefined && { line_items: input.line_items }),
            ...(input.inventory_line_items !== undefined && { inventory_line_items: input.inventory_line_items })
        };

        const config: ProxyConfiguration = {
            // https://docs.ramp.com/openapi/developer-api.json (Create a draft bill: POST /developer/v1/bills/drafts)
            endpoint: '/developer/v1/bills/drafts',
            data,
            // Creating a draft is not idempotent; a retry after a lost response could create a duplicate draft.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        };

        const response = await nango.post(config);

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
