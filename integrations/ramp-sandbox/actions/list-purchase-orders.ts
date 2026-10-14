import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const CurrencyAmountSchema = z.object({
    amount: z.number().describe('Amount in the smallest currency unit, e.g. cents for USD. Example: 10000 for $100.00'),
    currency_code: z.string().describe('ISO 4217 currency code. Example: "USD"'),
    minor_unit_conversion_rate: z.number().nullable().describe('Divisor that converts the amount to its major unit. Example: 100 for USD')
});

const AccountingFieldSchema = z.object({
    external_id: z.string().describe('External identifier of the accounting field on the client side.'),
    id: z.string().describe('Ramp identifier of the accounting field.'),
    name: z.string().describe('Name of the accounting field.'),
    type: z.string().describe('Accounting field type. Example: "GL_ACCOUNT"')
});

const AccountingFieldSelectionSchema = z.object({
    category_info: AccountingFieldSchema.describe('Accounting category (field) this selection belongs to.'),
    display_name: z.string().nullable().describe('Ramp-side display name override for the option, if any.'),
    external_code: z.string().nullable().optional().describe('ERP code for the accounting field option, if any.'),
    external_id: z.string().describe('External identifier of the accounting field option.'),
    id: z.string().describe('Ramp identifier of the accounting field option.'),
    name: z.string().describe('Name of the accounting field option.'),
    provider_name: z.string().nullable().describe('Name of the connected accounting provider, if any.')
});

const AddressSchema = z.object({
    address1: z.string().describe('First line of the delivery address.'),
    address2: z.string().nullable().describe('Second line of the delivery address, if any.'),
    city: z.string().describe('City of the delivery address.'),
    country: z.string().describe('Country of the delivery address.'),
    postal_code: z.string().nullable().describe('Postal code of the delivery address, if any.'),
    state: z.string().nullable().describe('State or region of the delivery address, if any.')
});

const LineItemSchema = z.object({
    accounting_field_selections: z.array(AccountingFieldSelectionSchema).describe('Accounting field options coding this line item.'),
    amount: CurrencyAmountSchema.describe('Total amount of the line item.'),
    description: z.string().nullable().describe('Description of the line item.'),
    end_date: z.string().nullable().describe('Date when spending for this line item ends, formatted as YYYY-MM-DD.'),
    external_id: z.string().nullable().describe('Client-provided external identifier of the line item, if any.'),
    id: z.string().describe('Unique identifier of the line item.'),
    quantity: z.number().nullable().describe('Quantity of the line item, if specified.'),
    remote_id: z.string().nullable().describe('Accounting remote identifier of the line item, if any.'),
    start_date: z.string().nullable().describe('Date when spending for this line item begins, formatted as YYYY-MM-DD.'),
    unit_price: CurrencyAmountSchema.nullable().describe('Unit price of the line item, if specified.'),
    unit_quantity: z.number().nullable().optional().describe('Quantity of units on recurring or subscription line items, if returned.'),
    withholding_rate: z.string().nullable().describe('Retainage withholding rate for the line item as a fractional decimal, if any. Example: "0.1" means 10%')
});

const PurchaseOrderSchema = z.object({
    accounting_field_selections: z.array(AccountingFieldSelectionSchema).describe('Accounting field options coding the purchase order.'),
    amount: CurrencyAmountSchema.describe('Total amount of the purchase order.'),
    archived_at: z.string().nullable().describe('Timestamp when the purchase order was archived, if applicable.'),
    bill_ids: z.array(z.string()).describe('Identifiers of bills attached to the purchase order.'),
    billing_status: z.string().nullable().describe('Billing status. Example: "OPEN", "PARTIALLY_BILLED", "FULLY_BILLED", "CLOSED", "DELETED"'),
    created_at: z.string().describe('Creation timestamp in ISO 8601 format.'),
    creation_source: z.string().describe('How the purchase order was created. Example: "RAMP", "DEVELOPER_API", "ACCOUNTING_PROVIDER", "EXTERNAL_IMPORT"'),
    entity_id: z.string().describe('Identifier of the associated business entity.'),
    external_id: z.string().nullable().describe('Client-side unique identifier of the purchase order, if provided.'),
    id: z.string().describe('Unique identifier of the purchase order.'),
    item_receipt_ids: z.array(z.string()).describe('Identifiers of item receipts matched to the purchase order.'),
    line_items: z.array(LineItemSchema).describe('Line items on the purchase order.'),
    memo: z.string().nullable().describe('Memo of the purchase order, if any.'),
    name: z.string().nullable().describe('Name of the associated spend request, if any.'),
    net_payment_terms: z.number().nullable().describe('Number of days an invoice must be paid within after receipt, if set.'),
    owner_id: z.string().nullable().describe('Identifier of the spend request owner, present only for Ramp-created purchase orders.'),
    promise_date: z.string().nullable().describe('Date the vendor will deliver the goods or services, in ISO 8601 format.'),
    purchase_order_number: z.string().nullable().describe('Human-readable purchase order number, if assigned.'),
    ramp_url: z.string().describe('Stable URL linking to the purchase order in the Ramp web application.'),
    receipt_status: z.string().describe('Receipt status. Example: "NOT_RECEIVED", "PARTIALLY_RECEIVED", "FULLY_RECEIVED", "OVER_RECEIVED"'),
    remote_id: z.string().nullable().describe('Remote identifier from the connected accounting provider, if any.'),
    ship_to_address: AddressSchema.nullable().describe('Delivery address for the purchase order, if provided.'),
    ship_to_company_name: z.string().nullable().describe('Company name associated with the delivery address, if any.'),
    shipping_contact_email: z.string().nullable().describe('Email address of the delivery contact, if any.'),
    shipping_contact_first_name: z.string().nullable().describe('First name of the delivery contact, if any.'),
    shipping_contact_last_name: z.string().nullable().describe('Last name of the delivery contact, if any.'),
    shipping_contact_phone_number: z.string().nullable().describe('Phone number of the delivery contact, if any.'),
    spend_end_date: z.string().nullable().describe('Date when spending for this purchase order ends, in ISO 8601 format.'),
    spend_program_id: z.string().nullable().describe('Identifier of the associated spend program, null for accounting-imported purchase orders.'),
    spend_request_id: z.string().nullable().describe('Identifier of the associated spend request, null for accounting-imported purchase orders.'),
    spend_start_date: z.string().nullable().describe('Date when spending for this purchase order begins, in ISO 8601 format.'),
    spend_total_amount: CurrencyAmountSchema.nullable().describe('Total amount calculated for recurring purchases, if applicable.'),
    three_way_match_enabled: z.boolean().describe('Whether three-way match is enabled for the purchase order.'),
    transaction_ids: z.array(z.string()).describe('Identifiers of transactions attached to the purchase order.'),
    user_id: z.string().nullable().describe('Identifier of the user who created the spend request, present only for Ramp-created purchase orders.'),
    vendor_id: z.string().nullable().describe('Identifier of the vendor, if any.'),
    withholding_default_rate: z.string().nullable().describe('Default retainage withholding rate as a fractional decimal, if any. Example: "0.1" means 10%')
});

const ProviderPurchaseOrdersResponseSchema = z.object({
    data: z.array(PurchaseOrderSchema),
    page: z
        .object({
            next: z.string().nullable().optional()
        })
        .optional()
});

const InputSchema = z
    .object({
        cursor: z.string().min(1).optional().describe('Opaque pagination cursor from a previous response (`next_cursor`). Omit to fetch the first page.'),
        page_size: z.number().int().min(2).max(100).optional().describe('Number of purchase orders to return per page, between 2 and 100. Defaults to 20.'),
        creation_source: z
            .enum(['ACCOUNTING_PROVIDER', 'DEVELOPER_API', 'EXTERNAL_IMPORT', 'RAMP'])
            .optional()
            .describe('Only return purchase orders created from this source.'),
        from_created_at: z
            .string()
            .optional()
            .describe('Only return purchase orders created at or after this time. Full ISO 8601 datetime. Example: "2026-01-01T00:00:00Z"'),
        to_created_at: z
            .string()
            .optional()
            .describe('Only return purchase orders created before this time. Full ISO 8601 datetime. Example: "2026-12-31T00:00:00Z"'),
        external_id: z.string().optional().describe('Only return the purchase order with this exact client-side external identifier.'),
        remote_id: z.string().optional().describe('Only return the purchase order with this exact remote identifier from the connected accounting provider.'),
        receipt_status: z
            .enum(['FULLY_RECEIVED', 'NOT_RECEIVED', 'OVER_RECEIVED', 'PARTIALLY_RECEIVED'])
            .optional()
            .describe('Only return purchase orders with this receipt status.'),
        entity_id: z.string().optional().describe('Only return purchase orders belonging to this business entity ID.'),
        spend_request_id: z.string().optional().describe('Only return purchase orders associated with this spend request ID.'),
        three_way_match_enabled: z.boolean().optional().describe('Only return purchase orders with this three-way match setting.'),
        include_archived: z.boolean().optional().describe('Whether to include archived purchase orders. Defaults to false.')
    })
    .describe('Filters and pagination options for listing Ramp purchase orders.');

const OutputSchema = z
    .object({
        items: z.array(PurchaseOrderSchema).describe('Purchase orders returned for this page.'),
        next_cursor: z.string().optional().describe('Cursor to pass back as `cursor` to fetch the next page. Absent when there are no more pages.')
    })
    .describe('A page of Ramp purchase orders and the cursor for the next page.');

function extractStartCursor(next: string | null | undefined): string | undefined {
    if (next === null || next === undefined) {
        return undefined;
    }
    const match = next.match(/[?&]start=([^&]+)/);
    if (match === null || match[1] === undefined) {
        return undefined;
    }
    return decodeURIComponent(match[1]);
}

/**
 * @tags: [read]
 * @tagReason: Reads procurement purchase orders from Ramp; performs no provider mutation.
 * @pitfalls: `from_created_at`/`to_created_at` must be full ISO 8601 datetimes (bare dates are rejected); filters must be re-supplied on each page because the cursor does not carry them; archived purchase orders are excluded unless `include_archived` is true; the list omits the spend-program intake-form answers that the single purchase order endpoint returns.
 */
const action = createAction({
    description: 'List procurement purchase orders.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['purchase_orders:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.ramp.com/developer-api/v1/api/purchase-orders
            endpoint: '/developer/v1/purchase-orders',
            params: {
                ...(input.cursor !== undefined && { start: input.cursor }),
                ...(input.page_size !== undefined && { page_size: input.page_size }),
                ...(input.creation_source !== undefined && { creation_source: input.creation_source }),
                ...(input.from_created_at !== undefined && { from_created_at: input.from_created_at }),
                ...(input.to_created_at !== undefined && { to_created_at: input.to_created_at }),
                ...(input.external_id !== undefined && { external_id: input.external_id }),
                ...(input.remote_id !== undefined && { remote_id: input.remote_id }),
                ...(input.receipt_status !== undefined && { receipt_status: input.receipt_status }),
                ...(input.entity_id !== undefined && { entity_id: input.entity_id }),
                ...(input.spend_request_id !== undefined && { spend_request_id: input.spend_request_id }),
                ...(input.three_way_match_enabled !== undefined && { three_way_match_enabled: input.three_way_match_enabled.toString() }),
                ...(input.include_archived !== undefined && { include_archived: input.include_archived.toString() })
            },
            retries: 3
        };

        const response = await nango.get<unknown>(config);
        const parsed = ProviderPurchaseOrdersResponseSchema.parse(response.data);
        const next_cursor = extractStartCursor(parsed.page?.next);

        return {
            items: parsed.data,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
