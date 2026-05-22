import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Order ID. Example: 18')
});

const AddressSchema = z.object({
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

const LineItemSchema = z.object({
    id: z.number(),
    name: z.string(),
    product_id: z.number(),
    variation_id: z.number().optional(),
    quantity: z.number(),
    tax_class: z.string().optional(),
    subtotal: z.string().optional(),
    subtotal_tax: z.string().optional(),
    total: z.string().optional(),
    total_tax: z.string().optional(),
    sku: z.string().optional(),
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
    billing: AddressSchema.optional(),
    shipping: AddressSchema.optional(),
    payment_method: z.string().optional(),
    payment_method_title: z.string().optional(),
    transaction_id: z.string().optional(),
    date_completed: z.string().optional(),
    date_completed_gmt: z.string().optional(),
    date_paid: z.string().optional(),
    date_paid_gmt: z.string().optional(),
    cart_hash: z.string().optional(),
    line_items: z.array(LineItemSchema).optional(),
    tax_lines: z.array(z.unknown()).optional(),
    shipping_lines: z.array(z.unknown()).optional(),
    fee_lines: z.array(z.unknown()).optional(),
    coupon_lines: z.array(z.unknown()).optional(),
    refunds: z.array(z.unknown()).optional()
});

const action = createAction({
    description: 'Retrieve a single order from WooCommerce.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-order',
        group: 'Orders'
    },
    input: InputSchema,
    output: OrderSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OrderSchema>> => {
        const response = await nango.get({
            // https://woocommerce.github.io/woocommerce-rest-api-docs/#retrieve-an-order
            endpoint: `/wp-json/wc/v3/orders/${encodeURIComponent(String(input.id))}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Order ${input.id} not found`
            });
        }

        const order = OrderSchema.parse(response.data);

        return order;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
