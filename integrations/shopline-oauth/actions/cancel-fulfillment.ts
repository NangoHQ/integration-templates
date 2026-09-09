import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        order_id: z.string().describe('The order ID that the fulfillment belongs to. Example: "21076844541266089830983097"'),
        fulfillment_id: z.string().describe('The fulfillment ID to cancel. Example: "22076844543875955194563097"')
    })
    .describe('Input parameters for canceling a fulfillment.');

const MoneySchema = z.object({
    amount: z.string().describe('The monetary amount. Example: "100.00"'),
    currency_code: z.string().describe('The three-letter ISO 4217 currency code. Example: "USD"')
});

const MoneySetSchema = z.object({
    shop_money: MoneySchema.describe('The amount in the store currency.'),
    presentment_money: MoneySchema.describe('The amount in the buyer currency.')
});

const TaxLineSchema = z.object({
    price: z.string().describe('The tax amount in the store currency. Example: "0.00"'),
    price_set: MoneySetSchema.describe('The tax amount in both store and buyer currencies.'),
    rate: z.string().nullable().optional().describe('The tax rate as a decimal string. Example: "0.0200"'),
    title: z.string().describe('The tax title. Example: "VAT"')
});

const LineItemSchema = z.object({
    id: z.union([z.string(), z.number()]).describe('The line item snapshot ID.'),
    variant_id: z.string().describe('The variant ID.'),
    product_id: z.string().describe('The product ID.'),
    title: z.string().describe('The product title.'),
    name: z.string().describe('The SKU title.'),
    variant_title: z.string().nullable().optional().describe('The variant attribute values. Example: "Yellow / S"'),
    sku: z.string().nullable().optional().describe('The product SKU.'),
    price: z.string().describe('The unit price in the store currency. Example: "100.00"'),
    quantity: z.number().describe('The ordered quantity.'),
    fulfillment_quantity: z.number().describe('The quantity shipped in this fulfillment.'),
    fulfillable_quantity: z.number().describe('The remaining quantity that can be shipped.'),
    fulfillment_status: z.string().nullable().optional().describe('The fulfillment status of the line item. Example: "partial"'),
    requires_shipping: z.boolean().describe('Whether the item requires shipping.'),
    taxable: z.boolean().describe('Whether the item is taxable.'),
    grams: z.number().describe('The weight of the item in grams.'),
    total_discount: z.string().describe('The total discount amount. Example: "0.00"'),
    version: z.string().describe('The product version.'),
    price_set: MoneySetSchema.describe('The item price in both store and buyer currencies.'),
    total_discount_set: MoneySetSchema.describe('The discount amount in both store and buyer currencies.'),
    tax_lines: z.array(TaxLineSchema).describe('A list of tax lines for the item.')
});

const FulfillmentSchema = z
    .object({
        id: z.string().describe('The fulfillment ID.'),
        order_id: z.string().describe('The order ID that the fulfillment belongs to.'),
        status: z.string().describe('The fulfillment status. Example: "cancelled"'),
        name: z.string().describe('The fulfillment name. Example: "#1013.1"'),
        created_at: z.string().describe('The creation timestamp in ISO 8601 format.'),
        updated_at: z.string().describe('The last update timestamp in ISO 8601 format.'),
        tracking_company: z.string().nullable().optional().describe('The logistics service provider.'),
        tracking_number: z.string().nullable().optional().describe('The tracking number.'),
        tracking_url: z.string().nullable().optional().describe('The tracking URL.'),
        tracking_numbers: z.array(z.string()).describe('A list of tracking numbers.'),
        tracking_urls: z.array(z.string()).describe('A list of tracking URLs.'),
        tracking_info_list: z
            .array(
                z.object({
                    tracking_company: z.string().describe('The logistics company.'),
                    tracking_number: z.string().describe('The tracking number.'),
                    tracking_url: z.string().describe('The tracking URL.')
                })
            )
            .describe('A list of tracking information objects.'),
        line_items: z.array(LineItemSchema).describe('A list of line items included in the fulfillment.')
    })
    .describe('A cancelled fulfillment object.');

const OutputSchema = z
    .object({
        fulfillment: FulfillmentSchema.describe('The cancelled fulfillment details.')
    })
    .describe('The response from canceling a fulfillment.');

/**
 * @tags: [write, destructive]
 * @tagReason: Cancels an existing fulfillment, reverting line item fulfillment status and inventory allocations.
 */
const action = createAction({
    description: 'Cancel a fulfillment.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_assigned_fulfillment_orders'],

    exec: async (nango, input) => {
        const response = await nango.post({
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/order/shipping-and-fulfillment/cancel-fulfillment
            endpoint: `/admin/openapi/v20260601/fulfillments/${encodeURIComponent(input.order_id)}/${encodeURIComponent(input.fulfillment_id)}/cancel.json`,
            retries: 3
        });

        const providerResponse = OutputSchema.parse(response.data);
        return providerResponse;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
