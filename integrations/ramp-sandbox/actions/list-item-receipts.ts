import { z } from 'zod';
import { createAction } from 'nango';

const CurrencyAmountSchema = z.object({
    amount: z.number().describe('The amount in the smallest denomination of the currency, e.g. cents when currency_code is USD.'),
    currency_code: z.string().describe('ISO 4217 currency code of the amount, e.g. "USD".'),
    minor_unit_conversion_rate: z.number().nullable().describe('Divisor that converts amount to major units (100 for USD), or null when unknown.')
});

const InventoryAssignmentSchema = z.object({
    id: z.string().describe('Unique identifier of the inventory assignment.'),
    lot_number: z.string().describe('Lot number for this portion of the received quantity.'),
    quantity: z.string().describe('Quantity received for this lot, expressed as a decimal string.'),
    expiration_date: z.string().nullable().describe('Expiration date of the lot (YYYY-MM-DD), or null when the lot is not expiration-tracked.')
});

const AccountingFieldSchema = z.object({
    id: z.string().describe('Unique identifier of the accounting field within Ramp.'),
    name: z.string().describe('Name of the accounting field.'),
    external_id: z.string().describe('External identifier of the accounting field in the connected ERP.'),
    type: z.string().describe('Accounting field type, e.g. "GL_ACCOUNT" or "COST_CENTER".')
});

const AccountingFieldSelectionSchema = z.object({
    id: z.string().describe('Unique identifier of the selected accounting field option.'),
    name: z.string().describe('Name of the accounting field option.'),
    external_id: z.string().describe('External identifier of the accounting field option.'),
    external_code: z.string().nullable().optional().describe('Code of the accounting field option as displayed in the ERP, when available.'),
    display_name: z.string().nullable().describe('Ramp-side display name override for the option, or null when unset.'),
    provider_name: z.string().nullable().describe('Name of the accounting provider the option belongs to, or null when unavailable.'),
    category_info: AccountingFieldSchema.describe('The accounting field (category) this selection applies to.')
});

const ItemReceiptLineItemSchema = z.object({
    id: z.string().describe('Unique identifier of the item receipt line item.'),
    purchase_order_line_item_id: z.string().describe('Identifier of the purchase order line item that was received.'),
    quantity: z.number().nullable().describe('Quantity received on this line item, or null when not recorded.'),
    unit_quantity: z.number().nullable().optional().describe('Number of units received per unit price, when reported by the provider.'),
    unit_price: CurrencyAmountSchema.nullable().describe('Cost per unit of the received line item, or null when unavailable.'),
    amount: CurrencyAmountSchema.nullable().describe('Total cost of the received line item, or null when unavailable.'),
    memo: z.string().nullable().describe('Memo attached to the line item, or null when none.'),
    remote_id: z.string().nullable().describe('Accounting remote identifier of the line item, or null when not synced.'),
    accounting_field_selections: z.array(AccountingFieldSelectionSchema).describe('Accounting field (category) selections recorded on the line item.'),
    inventory_assignments: z.array(InventoryAssignmentSchema).describe('Per-lot inventory detail for lot-tracked items.')
});

const ItemReceiptSchema = z.object({
    id: z.string().describe('Unique identifier of the item receipt.'),
    item_receipt_number: z.string().describe('User-defined identifier of the item receipt.'),
    purchase_order_id: z.string().describe('Identifier of the purchase order the item receipt belongs to.'),
    received_at: z.string().describe('ISO 8601 datetime when the items were received.'),
    created_at: z.string().describe('ISO 8601 datetime when the item receipt was created.'),
    archived_at: z.string().nullable().describe('ISO 8601 datetime when the item receipt was archived, or null when active.'),
    memo: z.string().nullable().describe('Memo attached to the item receipt, or null when none.'),
    remote_id: z.string().nullable().describe('Accounting remote identifier of the item receipt, or null when not synced.'),
    documents: z.array(z.string()).describe('URLs of documents attached to the item receipt.'),
    line_items: z.array(ItemReceiptLineItemSchema).describe('Line items recording quantities received against purchase order line items.')
});

const InputSchema = z
    .object({
        cursor: z.string().uuid().optional().describe('Pagination cursor returned as next_cursor by a previous call. Omit to fetch the first page.'),
        page_size: z.number().int().min(2).max(100).optional().describe('Number of item receipts per page, between 2 and 100. Defaults to 20.'),
        entity_id: z.string().uuid().optional().describe('Filter to item receipts belonging to a single business entity ID.'),
        purchase_order_id: z.string().uuid().optional().describe('Filter to item receipts belonging to a single purchase order ID.'),
        purchase_order_line_item_id: z.string().uuid().optional().describe('Filter to item receipts for a single purchase order line item ID.'),
        include_archived: z.boolean().optional().describe('Include archived item receipts. Defaults to false.')
    })
    .describe('Filters for listing item receipts, including pagination and purchase order or entity scoping.');

const OutputSchema = z
    .object({
        items: z.array(ItemReceiptSchema).describe('Item receipts returned on this page.'),
        next_cursor: z.string().optional().describe('Cursor to pass as input.cursor to fetch the next page. Absent when there are no more results.')
    })
    .describe('A page of item receipts recording quantities received against purchase order line items.');

const ProviderPageSchema = z.object({
    data: z.array(ItemReceiptSchema),
    page: z.object({
        next: z.string().nullable()
    })
});

/**
 * @tags: [read]
 * @tagReason: Lists item receipts from the provider and never mutates provider data.
 * @pitfalls: Archived item receipts are excluded unless include_archived is true; the Item Receipts API requires a Ramp Plus plan, and results are served from a read replica so newly created receipts may not appear immediately.
 */
const action = createAction({
    description: 'List item receipts recording physical or quantity receipt against purchase order line items.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['item_receipts:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.ramp.com/openapi/developer-api.json - GET /developer/v1/item-receipts
            endpoint: '/developer/v1/item-receipts',
            params: {
                ...(input.cursor !== undefined && { start: input.cursor }),
                ...(input.page_size !== undefined && { page_size: input.page_size }),
                ...(input.entity_id !== undefined && { entity_id: input.entity_id }),
                ...(input.purchase_order_id !== undefined && { purchase_order_id: input.purchase_order_id }),
                ...(input.purchase_order_line_item_id !== undefined && { purchase_order_line_item_id: input.purchase_order_line_item_id }),
                ...(input.include_archived !== undefined && { include_archived: input.include_archived ? 'true' : 'false' })
            },
            retries: 3
        });

        const parsed = ProviderPageSchema.parse(response.data);

        let next_cursor: string | undefined;
        if (parsed.page.next !== null) {
            const nextUrl = new URL(parsed.page.next);
            const start = nextUrl.searchParams.get('start');
            if (start !== null && start !== '') {
                next_cursor = start;
            }
        }

        return {
            items: parsed.data,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
