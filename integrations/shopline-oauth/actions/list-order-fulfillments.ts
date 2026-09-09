import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        order_id: z.string().describe('Order ID. Example: "21076844538384771008630862"')
    })
    .describe('Input for listing order fulfillments.');

const PriceSetSchema = z
    .object({
        shop_money: z
            .object({
                amount: z.string().describe('Amount in shop currency.'),
                currency_code: z.string().describe('Currency code.')
            })
            .describe('Amount in the shop currency.')
            .optional(),
        presentment_money: z
            .object({
                amount: z.string().describe('Amount in presentment currency.'),
                currency_code: z.string().describe('Currency code.')
            })
            .describe('Amount in the presentment currency.')
            .optional()
    })
    .optional();

const TaxLineSchema = z
    .object({
        name: z.string().nullable().optional().describe('Name of the tax line.'),
        price: z.string().optional().describe('Tax amount.'),
        title: z.string().optional().describe('Tax title.'),
        rate: z.unknown().optional().describe('Tax rate.')
    })
    .passthrough();

const LineItemSchema = z
    .object({
        id: z.number().describe('Line item ID.'),
        sku: z.string().optional().describe('Stock keeping unit.'),
        requires_shipping: z.boolean().optional().describe('Whether the item requires shipping.'),
        taxable: z.boolean().optional().describe('Whether the item is taxable.'),
        variant_id: z.string().optional().describe('Variant ID.'),
        name: z.string().optional().describe('Line item name.'),
        title: z.string().optional().describe('Product title.'),
        product_id: z.string().optional().describe('Product ID.'),
        quantity: z.number().describe('Quantity of the item.'),
        price: z.string().optional().describe('Unit price.'),
        fulfillment_status: z.string().optional().describe('Fulfillment status of the line item.'),
        variant_title: z.string().optional().describe('Variant title.'),
        location_id: z.string().optional().describe('Location ID from which the item was fulfilled.'),
        total_discount: z.string().optional().describe('Total discount applied.'),
        price_set: PriceSetSchema.describe('Price set for the item.'),
        total_discount_set: PriceSetSchema.describe('Total discount set for the item.'),
        tax_lines: z.array(TaxLineSchema).optional().describe('Tax lines for the item.')
    })
    .passthrough();

const TrackingInfoSchema = z.object({
    tracking_number: z.string().describe('Tracking number.'),
    tracking_url: z.string().describe('Tracking URL.'),
    tracking_company: z.string().describe('Tracking company name.')
});

const FulfillmentSchema = z
    .object({
        id: z.string().describe('Unique identifier for the fulfillment.'),
        order_id: z.string().describe('ID of the order this fulfillment belongs to.'),
        status: z.string().describe('Fulfillment status. Example: "success", "cancelled", "pending".'),
        shipment_status: z.string().nullable().optional().describe('Shipment status if available.'),
        tracking_number: z.string().optional().describe('Primary tracking number.'),
        tracking_numbers: z.array(z.string()).optional().describe('List of tracking numbers.'),
        tracking_url: z.string().optional().describe('Primary tracking URL.'),
        tracking_urls: z.array(z.string()).optional().describe('List of tracking URLs.'),
        tracking_company: z.string().optional().describe('Shipping carrier name.'),
        tracking_info_list: z.array(TrackingInfoSchema).optional().describe('Detailed tracking information list.'),
        name: z.string().optional().describe('Fulfillment name. Example: "#1012.1".'),
        created_at: z.string().optional().describe('Timestamp when the fulfillment was created.'),
        updated_at: z.string().optional().describe('Timestamp when the fulfillment was last updated.'),
        line_items: z.array(LineItemSchema).optional().describe('Line items included in this fulfillment.')
    })
    .passthrough();

const OutputSchema = z
    .object({
        fulfillments: z.array(FulfillmentSchema).describe('List of fulfillments for the order.')
    })
    .describe('Output containing the list of fulfillments for the requested order.');

const ProviderResponseSchema = z.object({
    fulfillments: z.array(z.unknown())
});

/**
 * @tags: [read]
 * @tagReason: Reads fulfillment data from the provider API.
 */
const action = createAction({
    description: 'List all fulfillments for an order.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_orders'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/order/shipping-and-fulfillment/get-all-fulfillments-for-the-fulfillment-order
            endpoint: `/admin/openapi/v20260601/orders/${encodeURIComponent(input.order_id)}/fulfillments.json`,
            retries: 3
        };

        const response = await nango.get(config);
        const providerResponse = ProviderResponseSchema.parse(response.data);

        const fulfillments = providerResponse.fulfillments.map((item: unknown) => {
            return FulfillmentSchema.parse(item);
        });

        return { fulfillments };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
