import { z } from 'zod';
import { createAction } from 'nango';

const PurchaseOrderLineItemInputSchema = z.object({
    unit_quantity: z.number().describe('Quantity of the line item. Supports fractional values. Example: 2'),
    unit_price: z.number().describe('Unit price in MAJOR currency units (plain dollars), e.g. 100 means $100.00. Example: 100'),
    description: z.string().optional().describe('Description of the line item. Example: "Annual software subscription seat"'),
    external_id: z
        .string()
        .optional()
        .describe('Caller-side identifier for the line item, unique within the purchase order. Cannot be changed after creation.'),
    start_date: z.string().optional().describe('Date spending for this line item begins, in YYYY-MM-DD format. Example: "2026-01-01"'),
    end_date: z.string().optional().describe('Date spending for this line item ends, in YYYY-MM-DD format. Example: "2026-12-31"'),
    withholding_rate: z
        .number()
        .min(0)
        .lt(1)
        .optional()
        .describe(
            'Retainage withholding rate for this line item as a fractional decimal between 0 and 1 (e.g. 0.10 = 10%). Overrides the purchase order default.'
        )
});

const InputSchema = z
    .object({
        entity_id: z.string().describe('Unique identifier (UUID) of the business entity the purchase order belongs to.'),
        vendor_id: z.string().describe('Unique identifier (UUID) of the vendor the purchase order is placed with.'),
        currency: z.string().describe('ISO 4217 currency code of the purchase order. Example: "USD"'),
        three_way_match_enabled: z
            .boolean()
            .describe('Whether three-way match is enabled, i.e. whether an item receipt will be attached to indicate goods were received.'),
        line_items: z.array(PurchaseOrderLineItemInputSchema).min(1).describe('Line items for the purchase order. At least one is required.'),
        name: z
            .string()
            .regex(/\S/, 'name must contain at least one non-whitespace character')
            .optional()
            .describe('Name of the purchase order. Must contain at least one non-whitespace character.'),
        memo: z.string().optional().describe('Memo for the purchase order.'),
        owner_id: z.string().optional().describe('Unique identifier (UUID) of the purchase order owner. Defaults to the API caller when omitted.'),
        net_payment_terms: z.number().int().optional().describe('Number of days an invoice must be paid within after receipt. Example: 30'),
        promise_date: z.string().optional().describe('Date the vendor will deliver the goods or services, in YYYY-MM-DD format.'),
        purchase_order_number: z.string().optional().describe('Unique purchase order number in <PREFIX>-<number> format. Auto-generated when omitted.'),
        spend_start_date: z.string().optional().describe('Date spending for this purchase order begins, in YYYY-MM-DD format.'),
        spend_end_date: z.string().optional().describe('Date spending for this purchase order ends, in YYYY-MM-DD format.'),
        external_id: z.string().optional().describe('Caller-side identifier for the purchase order, unique per business. Cannot be changed after creation.'),
        withholding_default_rate: z
            .number()
            .min(0)
            .lt(1)
            .optional()
            .describe('Default retainage withholding rate for the purchase order as a fractional decimal between 0 and 1 (e.g. 0.10 = 10%).')
    })
    .describe('Input for creating a purchase order against a vendor.');

const ProviderCurrencyAmountSchema = z.object({
    amount: z.number(),
    currency_code: z.string(),
    minor_unit_conversion_rate: z.number().nullable().optional()
});

const ProviderPurchaseOrderLineItemSchema = z.object({
    id: z.string(),
    description: z.string().nullable().optional(),
    quantity: z.number().nullable().optional(),
    unit_price: ProviderCurrencyAmountSchema.nullable().optional(),
    amount: ProviderCurrencyAmountSchema,
    external_id: z.string().nullable().optional()
});

const ProviderPurchaseOrderSchema = z.object({
    id: z.string(),
    purchase_order_number: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    memo: z.string().nullable().optional(),
    entity_id: z.string(),
    vendor_id: z.string().nullable().optional(),
    owner_id: z.string().nullable().optional(),
    amount: ProviderCurrencyAmountSchema,
    spend_total_amount: ProviderCurrencyAmountSchema.nullable().optional(),
    three_way_match_enabled: z.boolean(),
    receipt_status: z.string(),
    billing_status: z.string().nullable().optional(),
    creation_source: z.string(),
    created_at: z.string(),
    archived_at: z.string().nullable().optional(),
    ramp_url: z.string(),
    line_items: z.array(ProviderPurchaseOrderLineItemSchema)
});

const OutputCurrencyAmountSchema = z.object({
    amount: z.number().describe('Amount in the smallest currency unit (minor units). For USD, 10000 means $100.00.'),
    currency_code: z.string().describe('ISO 4217 currency code of the amount. Example: "USD"'),
    minor_unit_conversion_rate: z
        .number()
        .optional()
        .describe('Divide amount by this rate to get the real currency value (100 for USD). Omitted when the provider does not report it.')
});

const OutputLineItemSchema = z.object({
    id: z.string().describe('Unique identifier of the line item.'),
    description: z.string().optional().describe('Description of the line item, when set.'),
    quantity: z.number().optional().describe('Quantity of the line item, when set.'),
    unit_price: OutputCurrencyAmountSchema.optional().describe('Unit price of the line item in minor units, when set.'),
    amount: OutputCurrencyAmountSchema.describe('Total amount of the line item in minor units.'),
    external_id: z.string().optional().describe('Caller-side identifier for the line item, if one was provided.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the created purchase order.'),
        purchase_order_number: z.string().optional().describe('Purchase order number in <PREFIX>-<number> format, when assigned.'),
        name: z.string().optional().describe('Name of the purchase order, when set.'),
        memo: z.string().optional().describe('Memo on the purchase order, when set.'),
        entity_id: z.string().describe('Identifier of the business entity the purchase order belongs to.'),
        vendor_id: z.string().optional().describe('Identifier of the vendor the purchase order is placed with.'),
        owner_id: z.string().optional().describe('Identifier of the purchase order owner, when set.'),
        amount: OutputCurrencyAmountSchema.describe('Total amount of the purchase order in minor units.'),
        spend_total_amount: OutputCurrencyAmountSchema.optional().describe('Total spend amount of the purchase order in minor units, when reported.'),
        three_way_match_enabled: z.boolean().describe('Whether three-way match is enabled for the purchase order.'),
        receipt_status: z.string().describe('Receipt status of the purchase order. Example: "NOT_RECEIVED"'),
        billing_status: z.string().optional().describe('Billing status of the purchase order, if any. Example: "OPEN"'),
        creation_source: z.string().describe('Source that created the purchase order. Example: "DEVELOPER_API"'),
        created_at: z.string().describe('ISO 8601 timestamp when the purchase order was created.'),
        archived_at: z.string().optional().describe('ISO 8601 timestamp when the purchase order was archived; omitted when it is not archived.'),
        ramp_url: z.string().describe('Stable URL linking to the purchase order in the Ramp web application.'),
        line_items: z.array(OutputLineItemSchema).describe('Line items on the created purchase order.')
    })
    .describe('The purchase order created by the provider.');

const toCurrencyAmount = (amount: z.infer<typeof ProviderCurrencyAmountSchema>): z.infer<typeof OutputCurrencyAmountSchema> => ({
    amount: amount.amount,
    currency_code: amount.currency_code,
    ...(amount.minor_unit_conversion_rate != null && { minor_unit_conversion_rate: amount.minor_unit_conversion_rate })
});

/**
 * @tags: [write]
 * @tagReason: Creates a new purchase order on the provider, which is a provider mutation.
 * @pitfalls: `unit_price` and `unit_quantity` are supplied in major currency units (e.g. 100 = $100.00), but every amount in the response is a minor-unit object (e.g. {amount: 10000} = $100.00); the response returns the line-item quantity as `quantity`, not `unit_quantity`; purchase orders cannot be deleted after creation, only archived.
 */
const action = createAction({
    description: 'Create a new purchase order against a vendor.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['purchase_orders:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const lineItems = input.line_items.map((item) => ({
            unit_quantity: item.unit_quantity,
            unit_price: item.unit_price,
            ...(item.description !== undefined && { description: item.description }),
            ...(item.external_id !== undefined && { external_id: item.external_id }),
            ...(item.start_date !== undefined && { start_date: item.start_date }),
            ...(item.end_date !== undefined && { end_date: item.end_date }),
            ...(item.withholding_rate !== undefined && { withholding_rate: item.withholding_rate })
        }));

        const data = {
            entity_id: input.entity_id,
            vendor_id: input.vendor_id,
            currency: input.currency,
            three_way_match_enabled: input.three_way_match_enabled,
            line_items: lineItems,
            ...(input.name !== undefined && { name: input.name }),
            ...(input.memo !== undefined && { memo: input.memo }),
            ...(input.owner_id !== undefined && { owner_id: input.owner_id }),
            ...(input.net_payment_terms !== undefined && { net_payment_terms: input.net_payment_terms }),
            ...(input.promise_date !== undefined && { promise_date: input.promise_date }),
            ...(input.purchase_order_number !== undefined && { purchase_order_number: input.purchase_order_number }),
            ...(input.spend_start_date !== undefined && { spend_start_date: input.spend_start_date }),
            ...(input.spend_end_date !== undefined && { spend_end_date: input.spend_end_date }),
            ...(input.external_id !== undefined && { external_id: input.external_id }),
            ...(input.withholding_default_rate !== undefined && { withholding_default_rate: input.withholding_default_rate })
        };

        // Creating a purchase order is not idempotent and the API has no idempotency key, so a retry after a lost response could create a duplicate.
        const response = await nango.post({
            // https://docs.ramp.com/developer-api/v1/api-reference/purchase-orders/create-a-purchase-order
            endpoint: '/developer/v1/purchase-orders',
            data,
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const purchaseOrder = ProviderPurchaseOrderSchema.parse(response.data);

        return {
            id: purchaseOrder.id,
            entity_id: purchaseOrder.entity_id,
            amount: toCurrencyAmount(purchaseOrder.amount),
            three_way_match_enabled: purchaseOrder.three_way_match_enabled,
            receipt_status: purchaseOrder.receipt_status,
            creation_source: purchaseOrder.creation_source,
            created_at: purchaseOrder.created_at,
            ramp_url: purchaseOrder.ramp_url,
            line_items: purchaseOrder.line_items.map((item) => ({
                id: item.id,
                amount: toCurrencyAmount(item.amount),
                ...(item.description != null && { description: item.description }),
                ...(item.quantity != null && { quantity: item.quantity }),
                ...(item.unit_price != null && { unit_price: toCurrencyAmount(item.unit_price) }),
                ...(item.external_id != null && { external_id: item.external_id })
            })),
            ...(purchaseOrder.purchase_order_number != null && { purchase_order_number: purchaseOrder.purchase_order_number }),
            ...(purchaseOrder.name != null && { name: purchaseOrder.name }),
            ...(purchaseOrder.memo != null && { memo: purchaseOrder.memo }),
            ...(purchaseOrder.vendor_id != null && { vendor_id: purchaseOrder.vendor_id }),
            ...(purchaseOrder.owner_id != null && { owner_id: purchaseOrder.owner_id }),
            ...(purchaseOrder.spend_total_amount != null && { spend_total_amount: toCurrencyAmount(purchaseOrder.spend_total_amount) }),
            ...(purchaseOrder.billing_status != null && { billing_status: purchaseOrder.billing_status }),
            ...(purchaseOrder.archived_at != null && { archived_at: purchaseOrder.archived_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
