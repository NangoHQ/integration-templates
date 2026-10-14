import { z } from 'zod';
import { createAction } from 'nango';

const CurrencyAmountSchema = z.object({
    amount: z.number().describe('Amount in the smallest currency unit (e.g. cents for USD).'),
    currency_code: z.string().describe('ISO 4217 currency code. Example: "USD"'),
    minor_unit_conversion_rate: z
        .number()
        .nullable()
        .describe('Divisor used to convert amount to the real currency value (100 for USD), or null if not provided.')
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
    external_code: z.string().nullable().describe('External code of the accounting field option, or null if none.'),
    display_name: z.string().nullable().describe('Customer-set display name for the accounting field option, or null if none.'),
    provider_name: z.string().nullable().describe('Name of the accounting provider, or null if not provided.'),
    category_info: AccountingFieldSchema.describe('Information about the accounting category (field).')
});

const InventoryAssignmentSchema = z.object({
    id: z.string().describe('Unique identifier (UUID) of the inventory assignment.'),
    lot_number: z.string().describe('Lot number for this portion of the received quantity.'),
    quantity: z.string().describe('Quantity received for this lot, as a decimal string.'),
    expiration_date: z.string().nullable().describe('Expiration date for this lot (YYYY-MM-DD), or null if none.')
});

const ItemReceiptLineItemSchema = z.object({
    id: z.string().describe('Unique identifier (UUID) of the line item.'),
    purchase_order_line_item_id: z.string().describe('Unique identifier (UUID) of the purchase order line item that was received.'),
    quantity: z.number().nullable().describe('Received quantity of the line item, or null if not set.'),
    unit_quantity: z.number().nullable().optional().describe('Received quantity expressed in units, or null if not provided.'),
    unit_price: CurrencyAmountSchema.nullable().describe('Cost per unit of the line item, or null if not set.'),
    amount: CurrencyAmountSchema.nullable().describe('Total cost of the line item, or null if not set.'),
    memo: z.string().nullable().describe('Memo attached to the line item, or null if none.'),
    remote_id: z.string().nullable().describe('Accounting system remote identifier of the line item, or null if not synced.'),
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
        archived_at: z.string().nullable().describe('ISO 8601 timestamp when the item receipt was archived, or null if not archived.'),
        remote_id: z.string().nullable().describe('Accounting system remote identifier of the item receipt, or null if not synced.'),
        memo: z.string().nullable().describe('Memo attached to the item receipt, or null if none.'),
        documents: z.array(z.string()).describe('URLs of documents attached to the item receipt.'),
        line_items: z.array(ItemReceiptLineItemSchema).describe('Line items included in the item receipt.')
    })
    .describe('A single item receipt with its metadata, attached documents, and line items.');

/**
 * @tags: [read]
 * @tagReason: Reads a single item receipt by ID without modifying any provider data.
 * @pitfalls: Monetary fields (unit_price, amount) are returned as integers in the currency's minor unit (e.g. cents for USD), so divide by minor_unit_conversion_rate (which can be null) to get the real amount.
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

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
