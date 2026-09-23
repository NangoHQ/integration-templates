import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        order_id: z.string().describe('The unique identifier of the order to retrieve.')
    })
    .describe('ActionInput_shopline_oauth_getorder');

const MoneySchema = z
    .object({
        amount: z.string().optional().describe('The monetary amount.'),
        currency_code: z.string().optional().describe('The currency code, e.g. USD.')
    })
    .passthrough();

const PriceSetSchema = z
    .object({
        shop_money: MoneySchema.optional().describe('The price in shop currency.'),
        presentment_money: MoneySchema.optional().describe('The price in presentment currency.')
    })
    .passthrough();

const AddressSchema = z
    .object({
        first_name: z.string().nullable().optional().describe('First name of the recipient.'),
        last_name: z.string().nullable().optional().describe('Last name of the recipient.'),
        address1: z.string().nullable().optional().describe('Street address.'),
        city: z.string().nullable().optional().describe('City name.'),
        province: z.string().nullable().optional().describe('Province or state name.'),
        country: z.string().nullable().optional().describe('Country name.'),
        zip: z.string().nullable().optional().describe('Postal or zip code.'),
        phone: z.string().nullable().optional().describe('Phone number.')
    })
    .passthrough();

const CustomerSchema = z
    .object({
        id: z.string().nullable().optional().describe('The unique identifier of the customer.'),
        email: z.string().nullable().optional().describe('The email address of the customer.'),
        first_name: z.string().nullable().optional().describe('First name of the customer.'),
        last_name: z.string().nullable().optional().describe('Last name of the customer.'),
        phone: z.string().nullable().optional().describe('Phone number of the customer.')
    })
    .passthrough();

const LineItemSchema = z
    .object({
        id: z.string().optional().describe('The unique identifier of the line item.'),
        product_id: z.string().optional().describe('The unique identifier of the product.'),
        variant_id: z.string().optional().describe('The unique identifier of the product variant.'),
        title: z.string().optional().describe('The title of the product.'),
        quantity: z.number().optional().describe('The quantity ordered.'),
        price: z.string().optional().describe('The price of the item.'),
        sku: z.string().nullable().optional().describe('The SKU of the variant.'),
        image_url: z.string().nullable().optional().describe('The image URL for the line item.'),
        price_set: PriceSetSchema.optional().describe('The price set for the line item.'),
        variant_title: z.string().nullable().optional().describe('The title of the variant.'),
        vendor: z.string().nullable().optional().describe('The vendor of the product.'),
        taxable: z.boolean().optional().describe('Whether the line item is taxable.'),
        requires_shipping: z.boolean().optional().describe('Whether the line item requires shipping.'),
        attribute: z.string().nullable().optional().describe('The attribute string describing the variant options.')
    })
    .passthrough();

const FulfillmentSchema = z
    .object({
        id: z.string().optional().describe('The unique identifier of the fulfillment.'),
        order_id: z.string().optional().describe('The order ID associated with the fulfillment.'),
        status: z.string().optional().describe('The status of the fulfillment.'),
        tracking_number: z.string().nullable().optional().describe('The tracking number.'),
        tracking_company: z.string().nullable().optional().describe('The tracking company name.'),
        tracking_url: z.string().nullable().optional().describe('The tracking URL.')
    })
    .passthrough();

const RefundLineItemSchema = z
    .object({
        id: z.string().optional().describe('The unique identifier of the refund line item.'),
        line_item_id: z.string().optional().describe('The line item ID being refunded.'),
        quantity: z.number().optional().describe('The quantity refunded.'),
        restock_type: z.string().nullable().optional().describe('The restock type.')
    })
    .passthrough();

const RefundSchema = z
    .object({
        id: z.string().optional().describe('The unique identifier of the refund.'),
        order_id: z.string().optional().describe('The order ID associated with the refund.'),
        created_at: z.string().nullable().optional().describe('The date and time when the refund was created.'),
        note: z.string().nullable().optional().describe('A note attached to the refund.'),
        refund_line_items: z.array(RefundLineItemSchema).optional().describe('The line items included in the refund.')
    })
    .passthrough();

const PaymentDetailSchema = z
    .object({
        id: z.string().optional().describe('The unique identifier of the payment detail.'),
        amount: z.string().optional().describe('The payment amount.'),
        currency: z.string().optional().describe('The payment currency.'),
        kind: z.string().optional().describe('The kind of payment.'),
        status: z.string().optional().describe('The status of the payment.')
    })
    .passthrough();

const TaxLineSchema = z
    .object({
        title: z.string().optional().describe('The title of the tax line.'),
        price: z.string().optional().describe('The tax amount.'),
        rate: z.number().optional().describe('The tax rate.')
    })
    .passthrough();

const LocationSchema = z
    .object({
        location_id: z.string().optional().describe('The unique identifier of the location.'),
        name: z.string().optional().describe('The name of the location.'),
        type: z.string().optional().describe('The type of the location.')
    })
    .passthrough();

const RiskSchema = z
    .object({
        id: z.string().optional().describe('The unique identifier of the risk assessment.'),
        order_id: z.string().optional().describe('The order ID associated with the risk.'),
        score: z.string().optional().describe('The risk score.'),
        recommendation: z.string().optional().describe('The risk recommendation.')
    })
    .passthrough();

const OrderSchema = z
    .object({
        id: z.string().describe('The unique identifier of the order.'),
        name: z.string().describe('The order name, such as #1001.'),
        order_status_url: z.string().optional().describe('The URL for the customer to view the order status.'),
        created_at: z.string().nullable().optional().describe('The date and time when the order was created.'),
        updated_at: z.string().nullable().optional().describe('The date and time when the order was last updated.'),
        cancelled_at: z.string().nullable().optional().describe('The date and time when the order was cancelled.'),
        closed_at: z.string().nullable().optional().describe('The date and time when the order was closed.'),
        processed_at: z.string().nullable().optional().describe('The date and time when the order was processed.'),
        currency: z.string().optional().describe('The currency of the order.'),
        presentment_currency: z.string().nullable().optional().describe('The presentment currency of the order.'),
        email: z.string().nullable().optional().describe('The email address of the customer.'),
        phone: z.string().nullable().optional().describe('The phone number associated with the order.'),
        note: z.string().nullable().optional().describe('The note attached to the order.'),
        note_attributes: z.array(z.record(z.string(), z.unknown())).optional().describe('Extra metadata attached to the order.'),
        po_number: z.string().nullable().optional().describe('The purchase order number.'),
        tax_number: z.string().nullable().optional().describe('The tax number associated with the order.'),
        tax_type: z.string().nullable().optional().describe('The tax type for the order.'),
        taxes_included: z.boolean().nullable().optional().describe('Whether taxes are included in the order prices.'),
        financial_status: z.string().optional().describe('The financial status of the order, e.g. paid, unpaid.'),
        fulfillment_status: z.string().nullable().optional().describe('The fulfillment status of the order.'),
        status: z.string().nullable().optional().describe('The status of the order.'),
        order_source: z.string().nullable().optional().describe('The source of the order.'),
        pos_location_id: z.string().nullable().optional().describe('The POS location ID associated with the order.'),
        total_weight: z.number().nullable().optional().describe('The total weight of the order.'),
        total_tax: z.string().nullable().optional().describe('The total tax amount of the order.'),
        total_tax_set: PriceSetSchema.nullable().optional().describe('The total tax amount broken down by currency.'),
        subtotal_price: z.string().nullable().optional().describe('The subtotal price of the order before shipping and taxes.'),
        subtotal_price_set: PriceSetSchema.nullable().optional().describe('The subtotal price broken down by currency.'),
        total_discounts: z.string().nullable().optional().describe('The total discounts applied to the order.'),
        total_discounts_set: PriceSetSchema.nullable().optional().describe('The total discounts broken down by currency.'),
        total_line_items_price: z.string().nullable().optional().describe('The total price of the line items.'),
        total_line_items_price_set: PriceSetSchema.nullable().optional().describe('The total line items price broken down by currency.'),
        total_shipping_price: z.string().nullable().optional().describe('The total shipping price of the order.'),
        total_shipping_price_set: PriceSetSchema.nullable().optional().describe('The total shipping price broken down by currency.'),
        total_outstanding: z.string().nullable().optional().describe('The total outstanding amount on the order.'),
        total_tip_received: z.string().nullable().optional().describe('The total tip received for the order.'),
        adjust_price: z.string().optional().describe('The adjustment price of the order.'),
        adjust_price_set: PriceSetSchema.optional().describe('The adjustment price broken down by currency.'),
        deduct_member_point_amount: z.string().optional().describe('The member point deduction amount.'),
        deduct_member_point_amount_set: PriceSetSchema.nullable().optional().describe('The member point deduction amount broken down by currency.'),
        current_subtotal_price: z.string().optional().describe('The current subtotal price after discounts.'),
        current_subtotal_price_set: PriceSetSchema.optional().describe('The current subtotal price broken down by currency.'),
        current_total_price: z.string().optional().describe('The current total price of the order.'),
        current_total_price_set: PriceSetSchema.optional().describe('The current total price broken down by currency.'),
        current_total_tax: z.string().nullable().optional().describe('The current total tax amount.'),
        current_total_tax_set: PriceSetSchema.nullable().optional().describe('The current total tax broken down by currency.'),
        current_total_discounts: z.string().nullable().optional().describe('The current total discounts applied.'),
        current_total_discounts_set: PriceSetSchema.nullable().optional().describe('The current total discounts broken down by currency.'),
        current_total_duties_set: PriceSetSchema.nullable().optional().describe('The current total duties broken down by currency.'),
        shipping_address: AddressSchema.nullable().optional().describe('The shipping address for the order.'),
        billing_address: AddressSchema.nullable().optional().describe('The billing address for the order.'),
        customer: CustomerSchema.optional().describe('The customer associated with the order.'),
        line_items: z.array(LineItemSchema).optional().describe('The line items of the order.'),
        fulfillments: z.array(FulfillmentSchema).nullable().optional().describe('The fulfillments associated with the order.'),
        refunds: z.array(RefundSchema).nullable().optional().describe('The refunds applied to the order.'),
        payment_details: z.array(PaymentDetailSchema).nullable().optional().describe('The payment details for the order.'),
        risk: RiskSchema.nullable().optional().describe('The fraud risk assessment for the order.'),
        discount_codes: z.array(z.string()).nullable().optional().describe('The discount codes applied to the order.'),
        tax_lines: z.array(TaxLineSchema).nullable().optional().describe('The tax lines for the order.'),
        locations: z.array(LocationSchema).optional().describe('The locations associated with the order.'),
        tags: z.string().nullable().optional().describe('Tags attached to the order, encoded as a JSON-array string.'),
        test: z.boolean().optional().describe('Whether the order is a test order.')
    })
    .passthrough()
    .describe('ActionOutput_shopline_oauth_getorder');

/**
 * @tags: [read]
 * @tagReason: Reads a single order from the provider.
 * @pitfalls: Order tags are returned as a JSON-array-encoded string, not a plain comma-separated string or array.
 */
const action = createAction({
    description: 'Retrieve a single order (via list-orders scoped by the ids param - no dedicated single-order endpoint exists).',
    version: '1.0.0',
    input: InputSchema,
    output: OrderSchema,
    scopes: ['read_orders'],

    exec: async (nango, input): Promise<z.infer<typeof OrderSchema>> => {
        // https://developer.shopline.com/docs/admin-rest-api/v20260601/orders/orders/get-order
        const response = await nango.get({
            endpoint: '/admin/openapi/v20260601/orders.json',
            params: {
                ids: input.order_id
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                orders: z.array(OrderSchema)
            })
            .parse(response.data);

        const order = providerResponse.orders[0];

        if (!order) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Order not found',
                order_id: input.order_id
            });
        }

        return order;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
