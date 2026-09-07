import { z } from 'zod';
import { createAction } from 'nango';

const LineItemInputSchema = z.object({
    variant_id: z.string().describe('The ID of the product variant to order.'),
    product_id: z.string().describe('The ID of the product to order.'),
    quantity: z.number().int().describe('The number of units to order.'),
    price: z.string().describe('The price per unit as a string (e.g., "10.00").')
});

const PriceInfoInputSchema = z.object({
    total_shipping_price: z.string().describe('Total shipping price as a string (e.g., "0.00").'),
    taxes_included: z.boolean().describe('Whether taxes are included in the line item prices.')
});

const AddressInputSchema = z.object({
    first_name: z.string().optional().describe('First name for the address.'),
    last_name: z.string().optional().describe('Last name for the address.'),
    address1: z.string().optional().describe('Street address line 1.'),
    city: z.string().optional().describe('City name.'),
    province: z.string().optional().describe('Province or state name.'),
    country: z.string().optional().describe('Country name.'),
    zip: z.string().optional().describe('Postal or ZIP code.'),
    phone: z.string().optional().describe('Phone number associated with the address.')
});

const CustomerInputSchema = z.object({
    id: z
        .string()
        .optional()
        .describe('Existing customer ID to associate with the order. Prefer this over email/name fields to avoid creating a permanent new customer record.'),
    email: z.string().optional().describe('Customer email address.'),
    first_name: z.string().optional().describe('Customer first name.'),
    last_name: z.string().optional().describe('Customer last name.')
});

const InputSchema = z
    .object({
        line_items: z.array(LineItemInputSchema).max(100).describe('List of line items to include in the order (max 100 items).'),
        price_info: PriceInfoInputSchema.describe(
            'Pricing information required by the API even though it is not obviously marked as required in the field docs.'
        ),
        customer_id: z
            .string()
            .optional()
            .describe(
                'ID of an existing customer to associate with the order. Prefer this over inline customer details to avoid creating a permanent new customer record.'
            ),
        customer: CustomerInputSchema.optional().describe(
            'Inline customer details. WARNING: if no matching customer exists, this permanently creates a new Customer record that cannot be deleted later even if the order itself is removed.'
        ),
        shipping_address: AddressInputSchema.optional().describe('Shipping address for the order.'),
        billing_address: AddressInputSchema.optional().describe('Billing address for the order.'),
        currency: z.string().optional().describe('Currency code for the order (e.g., "USD").'),
        name: z.string().optional().describe('Optional order name override.'),
        financial_status: z.string().optional().describe('Financial status of the order (e.g., "paid", "pending").'),
        fulfillment_status: z.string().optional().describe('Fulfillment status of the order.'),
        transaction_list: z.array(z.object({}).passthrough()).optional().describe('List of transactions to record with the order.'),
        order_note: z.string().optional().describe('Note to attach to the order.'),
        send_receipt: z.boolean().optional().describe('Whether to send an order receipt email to the customer.')
    })
    .describe('Input for creating a new order directly via the SHOPLINE Admin API.');

const MoneySchema = z.object({
    amount: z.string().optional().describe('Monetary amount.'),
    currency_code: z.string().optional().describe('Currency code for the amount.')
});

const MoneySetSchema = z.object({
    shop_money: MoneySchema.optional().describe('Money amount in shop currency.'),
    presentment_money: MoneySchema.optional().describe('Money amount in presentment currency.')
});

const ProviderOrderSchema = z.object({
    id: z.string(),
    name: z.string().optional().nullable(),
    currency: z.string().optional().nullable(),
    financial_status: z.string().optional().nullable(),
    fulfillment_status: z.string().optional().nullable(),
    current_total_price: z.string().optional().nullable(),
    current_subtotal_price: z.string().optional().nullable(),
    current_total_price_set: MoneySetSchema.optional().nullable(),
    current_subtotal_price_set: MoneySetSchema.optional().nullable(),
    order_status_url: z.string().optional().nullable(),
    customer: z
        .object({
            id: z.string().optional().nullable(),
            email: z.string().optional().nullable(),
            first_name: z.string().optional().nullable(),
            last_name: z.string().optional().nullable()
        })
        .optional()
        .nullable(),
    line_items: z
        .array(
            z
                .object({
                    id: z.string().optional().nullable(),
                    variant_id: z.string().optional().nullable(),
                    product_id: z.string().optional().nullable(),
                    quantity: z.number().optional().nullable(),
                    price: z.string().optional().nullable(),
                    title: z.string().optional().nullable(),
                    variant_title: z.string().optional().nullable(),
                    sku: z.string().optional().nullable()
                })
                .passthrough()
        )
        .optional()
        .nullable(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable()
});

const OutputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the created order.'),
        name: z.string().optional().describe('The order name assigned by the store (e.g., "1014").'),
        currency: z.string().optional().describe('Currency code used for the order.'),
        financial_status: z.string().optional().describe('Financial status of the order (e.g., "unpaid", "paid").'),
        fulfillment_status: z.string().optional().describe('Fulfillment status of the order.'),
        current_total_price: z.string().optional().describe('Current total price of the order as a string.'),
        current_subtotal_price: z.string().optional().describe('Current subtotal price of the order as a string.'),
        current_total_price_set: MoneySetSchema.optional().describe('Computed total price set for the order.'),
        current_subtotal_price_set: MoneySetSchema.optional().describe('Computed subtotal price set for the order.'),
        order_status_url: z.string().optional().describe('URL for the customer to view the order status.'),
        customer: z
            .object({
                id: z.string().optional().describe('Customer ID associated with the order.'),
                email: z.string().optional().describe('Customer email address.'),
                first_name: z.string().optional().describe('Customer first name.'),
                last_name: z.string().optional().describe('Customer last name.')
            })
            .optional()
            .describe('Customer information associated with the created order.'),
        line_items: z
            .array(
                z
                    .object({
                        id: z.string().optional().describe('Line item ID.'),
                        variant_id: z.string().optional().describe('Variant ID of the ordered item.'),
                        product_id: z.string().optional().describe('Product ID of the ordered item.'),
                        quantity: z.number().optional().describe('Quantity ordered.'),
                        price: z.string().optional().describe('Unit price of the line item.'),
                        title: z.string().optional().describe('Title of the product variant.'),
                        variant_title: z.string().optional().describe('Title of the specific variant ordered.'),
                        sku: z.string().optional().describe('SKU of the ordered variant.')
                    })
                    .passthrough()
            )
            .optional()
            .describe('Line items included in the created order.'),
        created_at: z.string().optional().describe('ISO 8601 timestamp when the order was created.'),
        updated_at: z.string().optional().describe('ISO 8601 timestamp when the order was last updated.')
    })
    .describe('Output of a newly created order with computed pricing and line item details.');

/**
 * @tags: [write, destructive]
 * @tagReason: Creating an order mutates the provider. Supplying an inline customer object instead of an existing customer_id permanently creates a new Customer record with spend history that cannot be deleted even if the order is later removed.
 * @pitfalls: The `price_info` object is required even though the API field docs do not mark it as required. Providing an inline customer object instead of an existing customer id permanently creates a new Customer record with spend history that cannot be deleted even if the order itself is later removed.
 */
const action = createAction({
    description: 'Create an order directly (not a draft/checkout flow).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['orders'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {
            order: {
                line_items: input.line_items,
                price_info: input.price_info,
                ...(input.customer_id !== undefined && { customer: { id: input.customer_id } }),
                ...(input.customer !== undefined && { customer: input.customer }),
                ...(input.shipping_address !== undefined && { shipping_address: input.shipping_address }),
                ...(input.billing_address !== undefined && { billing_address: input.billing_address }),
                ...(input.currency !== undefined && { currency: input.currency }),
                ...(input.name !== undefined && { name: input.name }),
                ...(input.financial_status !== undefined && { financial_status: input.financial_status }),
                ...(input.fulfillment_status !== undefined && { fulfillment_status: input.fulfillment_status }),
                ...(input.transaction_list !== undefined && { transaction_list: input.transaction_list }),
                ...(input.order_note !== undefined && { order_note: input.order_note }),
                ...(input.send_receipt !== undefined && { send_receipt: input.send_receipt })
            }
        };

        const response = await nango.post({
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/order/order-create-order
            endpoint: '/admin/openapi/v20260601/orders.json',
            data: body,
            retries: 10
        });

        const providerResponse = z
            .object({
                order: ProviderOrderSchema
            })
            .parse(response.data);

        const order = providerResponse.order;

        return {
            id: order.id,
            ...(order.name != null && { name: order.name }),
            ...(order.currency != null && { currency: order.currency }),
            ...(order.financial_status != null && { financial_status: order.financial_status }),
            ...(order.fulfillment_status != null && { fulfillment_status: order.fulfillment_status }),
            ...(order.current_total_price != null && { current_total_price: order.current_total_price }),
            ...(order.current_subtotal_price != null && { current_subtotal_price: order.current_subtotal_price }),
            ...(order.current_total_price_set != null && { current_total_price_set: order.current_total_price_set }),
            ...(order.current_subtotal_price_set != null && { current_subtotal_price_set: order.current_subtotal_price_set }),
            ...(order.order_status_url != null && { order_status_url: order.order_status_url }),
            ...(order.customer != null && {
                customer: {
                    ...(order.customer.id != null && { id: order.customer.id }),
                    ...(order.customer.email != null && { email: order.customer.email }),
                    ...(order.customer.first_name != null && { first_name: order.customer.first_name }),
                    ...(order.customer.last_name != null && { last_name: order.customer.last_name })
                }
            }),
            ...(order.line_items != null && {
                line_items: order.line_items.map((item) => ({
                    ...(item.id != null && { id: item.id }),
                    ...(item.variant_id != null && { variant_id: item.variant_id }),
                    ...(item.product_id != null && { product_id: item.product_id }),
                    ...(item.quantity != null && { quantity: item.quantity }),
                    ...(item.price != null && { price: item.price }),
                    ...(item.title != null && { title: item.title }),
                    ...(item.variant_title != null && { variant_title: item.variant_title }),
                    ...(item.sku != null && { sku: item.sku })
                }))
            }),
            ...(order.created_at != null && { created_at: order.created_at }),
            ...(order.updated_at != null && { updated_at: order.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
