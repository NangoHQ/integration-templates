import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    order_id: z.number().describe('ID of the order. Example: 149'),
    page: z.number().optional().describe('The page to return in the response. Defaults to 1.'),
    limit: z.number().optional().describe('Number of results to return. Defaults to 50.')
});

const OrderProductAppliedDiscountsSchema = z.object({
    id: z.string().optional(),
    amount: z.string().optional(),
    name: z.string().optional(),
    code: z.string().nullable().optional(),
    target: z.string().optional()
});

const OrderProductOptionsSchema = z.object({
    id: z.number().optional(),
    option_id: z.number().optional(),
    order_product_id: z.number().optional(),
    product_option_id: z.number().optional(),
    display_name: z.string().optional(),
    display_value: z.string().optional(),
    value: z.string().optional(),
    type: z.string().optional(),
    name: z.string().optional(),
    display_style: z.string().optional(),
    display_name_customer: z.string().optional(),
    display_name_merchant: z.string().optional(),
    display_value_customer: z.string().optional(),
    display_value_merchant: z.string().optional()
});

const OrderProductConfigurableFieldsSchema = z.object({
    name: z.string().optional(),
    value: z.string().optional()
});

const OrderProductSchema = z
    .object({
        id: z.number(),
        order_id: z.number().optional(),
        product_id: z.number().optional(),
        order_pickup_method_id: z.number().optional(),
        order_address_id: z.number().optional(),
        name: z.string().optional(),
        sku: z.string().optional(),
        type: z.string().optional(),
        base_price: z.string().optional(),
        price_ex_tax: z.string().optional(),
        price_inc_tax: z.string().optional(),
        price_tax: z.string().optional(),
        base_total: z.string().optional(),
        total_ex_tax: z.string().optional(),
        total_inc_tax: z.string().optional(),
        total_tax: z.string().optional(),
        quantity: z.number().optional(),
        base_cost_price: z.string().optional(),
        cost_price_inc_tax: z.string().optional(),
        cost_price_ex_tax: z.string().optional(),
        weight: z.union([z.number(), z.string()]).optional(),
        width: z.string().optional(),
        height: z.string().optional(),
        depth: z.string().optional(),
        cost_price_tax: z.string().optional(),
        is_refunded: z.boolean().optional(),
        quantity_refunded: z.number().optional(),
        refund_amount: z.string().optional(),
        return_id: z.number().optional(),
        wrapping_id: z.number().optional(),
        wrapping_name: z.string().nullable().optional(),
        base_wrapping_cost: z.union([z.string(), z.number()]).optional(),
        wrapping_cost_ex_tax: z.string().optional(),
        wrapping_cost_inc_tax: z.string().optional(),
        wrapping_cost_tax: z.string().optional(),
        wrapping_message: z.string().optional(),
        quantity_shipped: z.number().optional(),
        event_name: z.string().nullable().optional(),
        event_date: z.string().nullable().optional(),
        fixed_shipping_cost: z.string().optional(),
        ebay_item_id: z.string().optional(),
        ebay_transaction_id: z.string().optional(),
        option_set_id: z.number().nullable().optional(),
        parent_order_product_id: z.number().nullable().optional(),
        is_bundled_product: z.boolean().optional(),
        bin_picking_number: z.string().optional(),
        external_id: z.string().nullable().optional(),
        brand: z.string().optional(),
        applied_discounts: z.array(OrderProductAppliedDiscountsSchema).optional(),
        product_options: z.array(OrderProductOptionsSchema).optional(),
        configurable_fields: z.array(OrderProductConfigurableFieldsSchema).optional(),
        upc: z.string().optional(),
        variant_id: z.number().optional(),
        name_customer: z.string().optional(),
        name_merchant: z.string().optional(),
        gift_certificate_id: z.number().nullable().optional(),
        discounted_total_inc_tax: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(OrderProductSchema),
    next_page: z.number().optional().describe('The next page number if more results are available.')
});

const action = createAction({
    description: 'List line items for an order.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['store_v2_orders_read_only'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.page ?? 1;
        const limit = input.limit ?? 50;

        // https://developer.bigcommerce.com/docs/rest-management/orders/order-products
        const response = await nango.get({
            endpoint: `/v2/orders/${encodeURIComponent(String(input.order_id))}/products`,
            params: {
                page: page,
                limit: limit
            },
            retries: 3
        });

        if (response.status === 204) {
            return {
                items: []
            };
        }

        const parsedData = z.array(OrderProductSchema).parse(response.data);
        const nextPage = parsedData.length === limit ? page + 1 : undefined;

        return {
            items: parsedData,
            ...(nextPage !== undefined && { next_page: nextPage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
