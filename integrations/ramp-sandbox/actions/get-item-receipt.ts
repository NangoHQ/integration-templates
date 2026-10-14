import { z } from 'zod';
import { createAction } from 'nango';

// Raw provider schemas (https://docs.ramp.com/openapi/developer-api.json, components ApiItemReceiptResource / ApiItemReceiptLineItem).
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
    // Documented as optional and nullable: Ramp may omit it or return null.
    external_code: z.string().nullish(),
    display_name: z.string().nullable(),
    provider_name: z.string().nullable(),
    category_info: ProviderAccountingFieldSchema
});

const ProviderInventoryAssignmentSchema = z.object({
    id: z.string(),
    lot_number: z.string(),
    quantity: z.string(),
    expiration_date: z.string().nullable()
});

const ProviderLineItemSchema = z.object({
    id: z.string(),
    purchase_order_line_item_id: z.string(),
    quantity: z.number().nullable(),
    unit_quantity: z.number().nullish(),
    unit_price: ProviderCurrencyAmountSchema.nullable(),
    amount: ProviderCurrencyAmountSchema.nullable(),
    memo: z.string().nullable(),
    remote_id: z.string().nullable(),
    accounting_field_selections: z.array(ProviderAccountingFieldSelectionSchema),
    inventory_assignments: z.array(ProviderInventoryAssignmentSchema)
});

const ProviderItemReceiptSchema = z.object({
    id: z.string(),
    item_receipt_number: z.string(),
    purchase_order_id: z.string(),
    created_at: z.string(),
    received_at: z.string(),
    archived_at: z.string().nullable(),
    remote_id: z.string().nullable(),
    memo: z.string().nullable(),
    documents: z.array(z.string()),
    line_items: z.array(ProviderLineItemSchema)
});

const CurrencyAmountSchema = z.object({
    amount: z.number().describe('Amount in the smallest currency unit (e.g. cents for USD).'),
    currency_code: z.string().describe('ISO 4217 currency code. Example: "USD"'),
    minor_unit_conversion_rate: z
        .number()
        .optional()
        .describe('Divisor used to convert amount to the real currency value (100 for USD). Omitted when Ramp does not report it.')
});

const AccountingFieldSchema = z.object({
    id: z.string().describe('Unique identifier of the accounting field.'),
    name: z.string().describe('Name of the accounting field.'),
    external_id: z.string().describe('External identifier of the accounting field.'),
    type: z.string().describe('Accounting field type. Example: "GL_ACCOUNT"')
});

const AccountingFieldSelectionSchema = z.object({
    id: z.string().describe('Unique identifier of the accounting field option.'),
    name: z.string().describe('Name of the accounting field option.'),
    external_id: z.string().describe('External identifier of the accounting field option.'),
    external_code: z.string().optional().describe('External code of the accounting field option, when set.'),
    display_name: z.string().optional().describe('Customer-set display name for the accounting field option, when set.'),
    provider_name: z.string().optional().describe('Name of the accounting provider, when provided.'),
    category_info: AccountingFieldSchema.describe('Information about the accounting category (field).')
});

const InventoryAssignmentSchema = z.object({
    id: z.string().describe('Unique identifier (UUID) of the inventory assignment.'),
    lot_number: z.string().describe('Lot number for this portion of the received quantity.'),
    quantity: z.string().describe('Quantity received for this lot, as a decimal string.'),
    expiration_date: z.string().optional().describe('Expiration date for this lot (YYYY-MM-DD), when set.')
});

const ItemReceiptLineItemSchema = z.object({
    id: z.string().describe('Unique identifier (UUID) of the line item.'),
    purchase_order_line_item_id: z.string().describe('Unique identifier (UUID) of the purchase order line item that was received.'),
    quantity: z.number().optional().describe('Received quantity of the line item, when set.'),
    unit_quantity: z.number().optional().describe('Received quantity expressed in units, when provided.'),
    unit_price: CurrencyAmountSchema.optional().describe('Cost per unit of the line item, when set.'),
    amount: CurrencyAmountSchema.optional().describe('Total cost of the line item, when set.'),
    memo: z.string().optional().describe('Memo attached to the line item, when set.'),
    remote_id: z.string().optional().describe('Accounting system remote identifier of the line item, when synced.'),
    accounting_field_selections: z.array(AccountingFieldSelectionSchema).describe('Accounting field selections (e.g. GL accounts) applied to the line item.'),
    inventory_assignments: z.array(InventoryAssignmentSchema).describe('Per-lot inventory assignments for lot-tracked items.')
});

const InputSchema = z
    .object({
        item_receipt_id: z.string().describe('Unique identifier (UUID) of the item receipt to retrieve. Example: "01a139e8-f0d6-70bf-84e9-ce1112f89886"')
    })
    .describe('Input for retrieving a single item receipt by its unique ID.');

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier (UUID) of the item receipt.'),
        item_receipt_number: z.string().describe('User-defined identifier of the item receipt. Example: "IR001"'),
        purchase_order_id: z.string().describe('Unique identifier (UUID) of the purchase order this receipt belongs to.'),
        created_at: z.string().describe('ISO 8601 timestamp when the item receipt was created.'),
        received_at: z.string().describe('ISO 8601 timestamp when the item receipt was received.'),
        archived_at: z.string().optional().describe('ISO 8601 timestamp when the item receipt was archived; omitted when not archived.'),
        remote_id: z.string().optional().describe('Accounting system remote identifier of the item receipt, when synced.'),
        memo: z.string().optional().describe('Memo attached to the item receipt, when set.'),
        documents: z.array(z.string()).describe('URLs of documents attached to the item receipt.'),
        line_items: z.array(ItemReceiptLineItemSchema).describe('Line items included in the item receipt.')
    })
    .describe('A single item receipt with its metadata, attached documents, and line items.');

function toCurrencyAmount(amount: z.infer<typeof ProviderCurrencyAmountSchema>): z.infer<typeof CurrencyAmountSchema> {
    return {
        amount: amount.amount,
        currency_code: amount.currency_code,
        ...(amount.minor_unit_conversion_rate != null && { minor_unit_conversion_rate: amount.minor_unit_conversion_rate })
    };
}

function toAccountingFieldSelection(selection: z.infer<typeof ProviderAccountingFieldSelectionSchema>): z.infer<typeof AccountingFieldSelectionSchema> {
    return {
        id: selection.id,
        name: selection.name,
        external_id: selection.external_id,
        category_info: selection.category_info,
        ...(selection.external_code != null && { external_code: selection.external_code }),
        ...(selection.display_name != null && { display_name: selection.display_name }),
        ...(selection.provider_name != null && { provider_name: selection.provider_name })
    };
}

function toLineItem(item: z.infer<typeof ProviderLineItemSchema>): z.infer<typeof ItemReceiptLineItemSchema> {
    return {
        id: item.id,
        purchase_order_line_item_id: item.purchase_order_line_item_id,
        accounting_field_selections: item.accounting_field_selections.map(toAccountingFieldSelection),
        inventory_assignments: item.inventory_assignments.map((assignment) => ({
            id: assignment.id,
            lot_number: assignment.lot_number,
            quantity: assignment.quantity,
            ...(assignment.expiration_date != null && { expiration_date: assignment.expiration_date })
        })),
        ...(item.quantity != null && { quantity: item.quantity }),
        ...(item.unit_quantity != null && { unit_quantity: item.unit_quantity }),
        ...(item.unit_price != null && { unit_price: toCurrencyAmount(item.unit_price) }),
        ...(item.amount != null && { amount: toCurrencyAmount(item.amount) }),
        ...(item.memo != null && { memo: item.memo }),
        ...(item.remote_id != null && { remote_id: item.remote_id })
    };
}

/**
 * @tags: [read]
 * @tagReason: Reads a single item receipt by ID without modifying any provider data.
 * @pitfalls: Monetary fields (unit_price, amount) are returned as integers in the currency's minor unit (e.g. cents for USD), so divide by minor_unit_conversion_rate (omitted when Ramp does not report it) to get the real amount.
 */
const action = createAction({
    description: 'Retrieve a single item receipt by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['item_receipts:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.ramp.com/openapi/developer-api.json (GET /developer/v1/item-receipts/{item_receipt_id})
            endpoint: `/developer/v1/item-receipts/${encodeURIComponent(input.item_receipt_id)}`,
            retries: 3
        });

        const receipt = ProviderItemReceiptSchema.parse(response.data);

        return {
            id: receipt.id,
            item_receipt_number: receipt.item_receipt_number,
            purchase_order_id: receipt.purchase_order_id,
            created_at: receipt.created_at,
            received_at: receipt.received_at,
            documents: receipt.documents,
            line_items: receipt.line_items.map(toLineItem),
            ...(receipt.archived_at != null && { archived_at: receipt.archived_at }),
            ...(receipt.remote_id != null && { remote_id: receipt.remote_id }),
            ...(receipt.memo != null && { memo: receipt.memo })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
