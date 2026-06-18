import { z } from 'zod';
import { createAction } from 'nango';

const BillingSchema = z.object({
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

const ShippingSchema = z.object({
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

const LineItemSchema = z.object({
    product_id: z.number().optional(),
    variation_id: z.number().optional(),
    quantity: z.number().optional(),
    price: z.string().optional()
});

const ShippingLineSchema = z.object({
    method_id: z.string().optional(),
    method_title: z.string().optional(),
    total: z.string().optional()
});

const CouponLineSchema = z.object({
    code: z.string().optional()
});

const InputSchema = z.object({
    status: z.enum(['pending', 'processing', 'on-hold', 'completed', 'cancelled', 'refunded', 'failed', 'trash', 'checkout-draft']).optional(),
    currency: z.string().optional(),
    customer_id: z.number().optional(),
    customer_note: z.string().optional(),
    billing: BillingSchema.optional(),
    shipping: ShippingSchema.optional(),
    line_items: z.array(LineItemSchema).optional(),
    shipping_lines: z.array(ShippingLineSchema).optional(),
    coupon_lines: z.array(CouponLineSchema).optional(),
    payment_method: z.string().optional(),
    payment_method_title: z.string().optional(),
    set_paid: z.boolean().optional()
});

const ProviderOrderSchema = z.object({
    id: z.number(),
    parent_id: z.number(),
    status: z.string(),
    currency: z.string(),
    version: z.string(),
    prices_include_tax: z.boolean(),
    date_created: z.string(),
    date_modified: z.string(),
    discount_total: z.string(),
    discount_tax: z.string(),
    shipping_total: z.string(),
    shipping_tax: z.string(),
    cart_tax: z.string(),
    total: z.string(),
    total_tax: z.string(),
    customer_id: z.number(),
    order_key: z.string(),
    billing: z.object({}).passthrough(),
    shipping: z.object({}).passthrough(),
    payment_method: z.string(),
    payment_method_title: z.string(),
    transaction_id: z.string(),
    customer_ip_address: z.string(),
    customer_user_agent: z.string(),
    created_via: z.string(),
    customer_note: z.string(),
    date_completed: z.string().nullable(),
    date_paid: z.string().nullable(),
    cart_hash: z.string(),
    number: z.string(),
    meta_data: z.array(z.object({}).passthrough()),
    line_items: z.array(z.object({}).passthrough()),
    tax_lines: z.array(z.object({}).passthrough()),
    shipping_lines: z.array(z.object({}).passthrough()),
    fee_lines: z.array(z.object({}).passthrough()),
    coupon_lines: z.array(z.object({}).passthrough()),
    refunds: z.array(z.object({}).passthrough()),
    payment_url: z.string().optional(),
    is_editable: z.boolean().optional(),
    needs_payment: z.boolean().optional(),
    needs_processing: z.boolean().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    parent_id: z.number().optional(),
    status: z.string(),
    currency: z.string().optional(),
    total: z.string().optional(),
    customer_id: z.number().optional(),
    customer_note: z.string().optional(),
    billing: z.object({}).passthrough().optional(),
    shipping: z.object({}).passthrough().optional(),
    payment_method: z.string().optional(),
    payment_method_title: z.string().optional(),
    date_created: z.string().optional(),
    date_modified: z.string().optional(),
    line_items: z.array(z.object({}).passthrough()).optional(),
    shipping_lines: z.array(z.object({}).passthrough()).optional(),
    coupon_lines: z.array(z.object({}).passthrough()).optional()
});

const action = createAction({
    description: 'Create a order in WooCommerce.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read', 'write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, unknown> = {
            ...(input.status !== undefined && { status: input.status }),
            ...(input.currency !== undefined && { currency: input.currency }),
            ...(input.customer_id !== undefined && { customer_id: input.customer_id }),
            ...(input.customer_note !== undefined && { customer_note: input.customer_note }),
            ...(input.billing !== undefined && { billing: input.billing }),
            ...(input.shipping !== undefined && { shipping: input.shipping }),
            ...(input.line_items !== undefined && { line_items: input.line_items }),
            ...(input.shipping_lines !== undefined && { shipping_lines: input.shipping_lines }),
            ...(input.coupon_lines !== undefined && { coupon_lines: input.coupon_lines }),
            ...(input.payment_method !== undefined && { payment_method: input.payment_method }),
            ...(input.payment_method_title !== undefined && { payment_method_title: input.payment_method_title }),
            ...(input.set_paid !== undefined && { set_paid: input.set_paid })
        };

        // https://woocommerce.github.io/woocommerce-rest-api-docs/#create-an-order
        const response = await nango.post({
            endpoint: '/wp-json/wc/v3/orders',
            data: requestBody,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Failed to create order'
            });
        }

        const providerOrder = ProviderOrderSchema.parse(response.data);

        return {
            id: providerOrder.id,
            ...(providerOrder.parent_id !== undefined && { parent_id: providerOrder.parent_id }),
            status: providerOrder.status,
            ...(providerOrder.currency !== undefined && { currency: providerOrder.currency }),
            ...(providerOrder.total !== undefined && { total: providerOrder.total }),
            ...(providerOrder.customer_id !== undefined && { customer_id: providerOrder.customer_id }),
            ...(providerOrder.customer_note !== undefined && { customer_note: providerOrder.customer_note }),
            ...(providerOrder.billing && Object.keys(providerOrder.billing).length > 0 && { billing: providerOrder.billing }),
            ...(providerOrder.shipping && Object.keys(providerOrder.shipping).length > 0 && { shipping: providerOrder.shipping }),
            ...(providerOrder.payment_method !== undefined && { payment_method: providerOrder.payment_method }),
            ...(providerOrder.payment_method_title !== undefined && { payment_method_title: providerOrder.payment_method_title }),
            ...(providerOrder.date_created !== undefined && { date_created: providerOrder.date_created }),
            ...(providerOrder.date_modified !== undefined && { date_modified: providerOrder.date_modified }),
            ...(providerOrder.line_items !== undefined && { line_items: providerOrder.line_items }),
            ...(providerOrder.shipping_lines !== undefined && { shipping_lines: providerOrder.shipping_lines }),
            ...(providerOrder.coupon_lines !== undefined && { coupon_lines: providerOrder.coupon_lines })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
