import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    page: z.number().int().min(1).optional().describe('Current page of the collection. Default: 1'),
    per_page: z.number().int().min(1).max(100).optional().describe('Maximum number of items to be returned. Default: 10'),
    search: z.string().optional().describe('Limit results to those matching a string'),
    status: z
        .enum(['any', 'pending', 'processing', 'on-hold', 'completed', 'cancelled', 'refunded', 'failed', 'trash'])
        .optional()
        .describe('Limit results to orders with a specific status. Default: any'),
    customer: z.number().int().optional().describe('Limit results to orders assigned a specific customer ID'),
    product: z.number().int().optional().describe('Limit results to orders assigned a specific product ID'),
    after: z.string().optional().describe('Limit response to resources published after a given ISO8601 compliant date'),
    before: z.string().optional().describe('Limit response to resources published before a given ISO8601 compliant date'),
    modified_after: z.string().optional().describe('Limit response to resources modified after a given ISO8601 compliant date'),
    modified_before: z.string().optional().describe('Limit response to resources modified before a given ISO8601 compliant date'),
    dates_are_gmt: z.boolean().optional().describe('Whether to interpret dates as GMT when limiting response by date'),
    order: z.enum(['asc', 'desc']).optional().describe('Order sort attribute. Default: desc'),
    orderby: z.enum(['date', 'modified', 'id', 'include', 'title', 'slug']).optional().describe('Sort collection by object attribute. Default: date')
});

const OrderBillingSchema = z.object({
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    company: z.string().optional(),
    address_1: z.string().optional(),
    address_2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postcode: z.string().optional(),
    country: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional()
});

const OrderShippingSchema = z.object({
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    company: z.string().optional(),
    address_1: z.string().optional(),
    address_2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postcode: z.string().optional(),
    country: z.string().optional()
});

const OrderLineItemSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    product_id: z.number().optional(),
    variation_id: z.number().optional(),
    quantity: z.number().optional(),
    tax_class: z.string().optional(),
    subtotal: z.string().optional(),
    subtotal_tax: z.string().optional(),
    total: z.string().optional(),
    total_tax: z.string().optional(),
    sku: z.string().nullable().optional(),
    price: z.number().optional()
});

const OrderSchema = z.object({
    id: z.number(),
    parent_id: z.number().optional(),
    number: z.string().optional(),
    order_key: z.string().optional(),
    created_via: z.string().optional(),
    version: z.string().optional(),
    status: z.string().optional(),
    currency: z.string().optional(),
    date_created: z.string().optional(),
    date_created_gmt: z.string().optional(),
    date_modified: z.string().optional(),
    date_modified_gmt: z.string().optional(),
    discount_total: z.string().optional(),
    discount_tax: z.string().optional(),
    shipping_total: z.string().optional(),
    shipping_tax: z.string().optional(),
    cart_tax: z.string().optional(),
    total: z.string().optional(),
    total_tax: z.string().optional(),
    prices_include_tax: z.boolean().optional(),
    customer_id: z.number().optional(),
    customer_ip_address: z.string().optional(),
    customer_user_agent: z.string().optional(),
    customer_note: z.string().optional(),
    billing: OrderBillingSchema.optional(),
    shipping: OrderShippingSchema.optional(),
    payment_method: z.string().optional(),
    payment_method_title: z.string().optional(),
    transaction_id: z.string().optional(),
    date_paid: z.string().nullable().optional(),
    date_paid_gmt: z.string().nullable().optional(),
    date_completed: z.string().nullable().optional(),
    date_completed_gmt: z.string().nullable().optional(),
    cart_hash: z.string().optional(),
    line_items: z.array(OrderLineItemSchema).optional()
});

const OutputSchema = z.object({
    orders: z.array(OrderSchema),
    total_pages: z.number().optional(),
    total_count: z.number().optional()
});

const action = createAction({
    description: 'List orders from WooCommerce',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number | string[] | number[]> = {};

        if (input.page !== undefined) {
            params['page'] = input.page;
        }
        if (input.per_page !== undefined) {
            params['per_page'] = input.per_page;
        }
        if (input.search !== undefined) {
            params['search'] = input.search;
        }
        if (input.status !== undefined) {
            params['status'] = input.status;
        }
        if (input.customer !== undefined) {
            params['customer'] = input.customer;
        }
        if (input.product !== undefined) {
            params['product'] = input.product;
        }
        if (input.after !== undefined) {
            params['after'] = input.after;
        }
        if (input.before !== undefined) {
            params['before'] = input.before;
        }
        if (input.modified_after !== undefined) {
            params['modified_after'] = input.modified_after;
        }
        if (input.modified_before !== undefined) {
            params['modified_before'] = input.modified_before;
        }
        if (input.dates_are_gmt !== undefined) {
            params['dates_are_gmt'] = String(input.dates_are_gmt);
        }
        if (input.order !== undefined) {
            params['order'] = input.order;
        }
        if (input.orderby !== undefined) {
            params['orderby'] = input.orderby;
        }

        // https://woocommerce.github.io/woocommerce-rest-api-docs/#list-all-orders
        const response = await nango.get({
            endpoint: '/wp-json/wc/v3/orders',
            params: params,
            retries: 3
        });

        const orders = z.array(OrderSchema).parse(response.data);

        const totalPages = response.headers['x-wp-totalpages'];
        const totalCount = response.headers['x-wp-total'];

        return {
            orders: orders,
            ...(totalPages !== undefined && { total_pages: parseInt(String(totalPages), 10) }),
            ...(totalCount !== undefined && { total_count: parseInt(String(totalCount), 10) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
