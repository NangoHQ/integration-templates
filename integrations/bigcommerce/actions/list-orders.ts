import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().regex(/^\d+$/).optional().describe('Pagination cursor. For this API, pass the page number as a string. Omit for the first page.'),
    limit: z.number().min(1).max(250).optional().describe('Number of results per page. Max 250. Defaults to 50.'),
    min_date_modified: z.string().optional().describe('Minimum date the order was modified in ISO-8601 or RFC-2822.')
});

const ResourceSchema = z.object({
    url: z.string(),
    resource: z.string()
});

const FormFieldSchema = z.object({
    name: z.string(),
    value: z.string().optional()
});

const BillingAddressSchema = z.object({
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    company: z.string().optional(),
    street_1: z.string().optional(),
    street_2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
    country_iso2: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    form_fields: z.array(FormFieldSchema).optional()
});

const ProviderOrderSchema = z
    .object({
        id: z.number(),
        customer_id: z.number().optional().nullable(),
        date_created: z.string().optional().nullable(),
        date_modified: z.string().optional().nullable(),
        date_shipped: z.string().optional().nullable(),
        status_id: z.number().optional().nullable(),
        status: z.string().optional().nullable(),
        subtotal_ex_tax: z.string().optional().nullable(),
        subtotal_inc_tax: z.string().optional().nullable(),
        subtotal_tax: z.string().optional().nullable(),
        base_shipping_cost: z.string().optional().nullable(),
        shipping_cost_ex_tax: z.string().optional().nullable(),
        shipping_cost_inc_tax: z.string().optional().nullable(),
        shipping_cost_tax: z.string().optional().nullable(),
        shipping_cost_tax_class_id: z.number().optional().nullable(),
        base_handling_cost: z.string().optional().nullable(),
        handling_cost_ex_tax: z.string().optional().nullable(),
        handling_cost_inc_tax: z.string().optional().nullable(),
        handling_cost_tax: z.string().optional().nullable(),
        handling_cost_tax_class_id: z.number().optional().nullable(),
        base_wrapping_cost: z.string().optional().nullable(),
        wrapping_cost_ex_tax: z.string().optional().nullable(),
        wrapping_cost_inc_tax: z.string().optional().nullable(),
        wrapping_cost_tax: z.string().optional().nullable(),
        wrapping_cost_tax_class_id: z.number().optional().nullable(),
        total_ex_tax: z.string().optional().nullable(),
        total_inc_tax: z.string().optional().nullable(),
        total_tax: z.string().optional().nullable(),
        items_total: z.number().optional().nullable(),
        items_shipped: z.number().optional().nullable(),
        payment_method: z.string().optional().nullable(),
        payment_provider_id: z.string().optional().nullable(),
        payment_status: z.string().optional().nullable(),
        refunded_amount: z.string().optional().nullable(),
        order_is_digital: z.boolean().optional().nullable(),
        store_credit_amount: z.string().optional().nullable(),
        gift_certificate_amount: z.string().optional().nullable(),
        ip_address: z.string().optional().nullable(),
        ip_address_v6: z.string().optional().nullable(),
        geoip_country: z.string().optional().nullable(),
        geoip_country_iso2: z.string().optional().nullable(),
        currency_id: z.number().optional().nullable(),
        currency_code: z.string().optional().nullable(),
        currency_exchange_rate: z.string().optional().nullable(),
        default_currency_id: z.number().optional().nullable(),
        default_currency_code: z.string().optional().nullable(),
        store_default_currency_code: z.string().optional().nullable(),
        store_default_to_transactional_exchange_rate: z.string().optional().nullable(),
        staff_notes: z.string().optional().nullable(),
        customer_message: z.string().optional().nullable(),
        discount_amount: z.string().optional().nullable(),
        coupon_discount: z.string().optional().nullable(),
        shipping_address_count: z.number().optional().nullable(),
        is_deleted: z.boolean().optional().nullable(),
        ebay_order_id: z.string().optional().nullable(),
        cart_id: z.string().optional().nullable(),
        billing_address: BillingAddressSchema.optional().nullable(),
        is_email_opt_in: z.boolean().optional().nullable(),
        credit_card_type: z.string().optional().nullable(),
        order_source: z.string().optional().nullable(),
        channel_id: z.number().optional().nullable(),
        external_source: z.string().optional().nullable(),
        products: ResourceSchema.optional().nullable(),
        shipping_addresses: ResourceSchema.optional().nullable(),
        coupons: ResourceSchema.optional().nullable(),
        consignments: ResourceSchema.optional().nullable()
    })
    .passthrough();

const OrderSchema = z
    .object({
        id: z.number(),
        customer_id: z.number().optional(),
        date_created: z.string().optional(),
        date_modified: z.string().optional(),
        date_shipped: z.string().optional(),
        status_id: z.number().optional(),
        status: z.string().optional(),
        subtotal_ex_tax: z.string().optional(),
        subtotal_inc_tax: z.string().optional(),
        subtotal_tax: z.string().optional(),
        base_shipping_cost: z.string().optional(),
        shipping_cost_ex_tax: z.string().optional(),
        shipping_cost_inc_tax: z.string().optional(),
        shipping_cost_tax: z.string().optional(),
        shipping_cost_tax_class_id: z.number().optional(),
        base_handling_cost: z.string().optional(),
        handling_cost_ex_tax: z.string().optional(),
        handling_cost_inc_tax: z.string().optional(),
        handling_cost_tax: z.string().optional(),
        handling_cost_tax_class_id: z.number().optional(),
        base_wrapping_cost: z.string().optional(),
        wrapping_cost_ex_tax: z.string().optional(),
        wrapping_cost_inc_tax: z.string().optional(),
        wrapping_cost_tax: z.string().optional(),
        wrapping_cost_tax_class_id: z.number().optional(),
        total_ex_tax: z.string().optional(),
        total_inc_tax: z.string().optional(),
        total_tax: z.string().optional(),
        items_total: z.number().optional(),
        items_shipped: z.number().optional(),
        payment_method: z.string().optional(),
        payment_provider_id: z.string().optional(),
        payment_status: z.string().optional(),
        refunded_amount: z.string().optional(),
        order_is_digital: z.boolean().optional(),
        store_credit_amount: z.string().optional(),
        gift_certificate_amount: z.string().optional(),
        ip_address: z.string().optional(),
        ip_address_v6: z.string().optional(),
        geoip_country: z.string().optional(),
        geoip_country_iso2: z.string().optional(),
        currency_id: z.number().optional(),
        currency_code: z.string().optional(),
        currency_exchange_rate: z.string().optional(),
        default_currency_id: z.number().optional(),
        default_currency_code: z.string().optional(),
        store_default_currency_code: z.string().optional(),
        store_default_to_transactional_exchange_rate: z.string().optional(),
        staff_notes: z.string().optional(),
        customer_message: z.string().optional(),
        discount_amount: z.string().optional(),
        coupon_discount: z.string().optional(),
        shipping_address_count: z.number().optional(),
        is_deleted: z.boolean().optional(),
        ebay_order_id: z.string().optional(),
        cart_id: z.string().optional(),
        billing_address: BillingAddressSchema.optional(),
        is_email_opt_in: z.boolean().optional(),
        credit_card_type: z.string().optional(),
        order_source: z.string().optional(),
        channel_id: z.number().optional(),
        external_source: z.string().optional(),
        products: ResourceSchema.optional(),
        shipping_addresses: ResourceSchema.optional(),
        coupons: ResourceSchema.optional(),
        consignments: ResourceSchema.optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(OrderSchema),
    next_cursor: z.string().optional()
});

function stripNulls(value: unknown): unknown {
    if (value === null || value === undefined) {
        return undefined;
    }
    if (Array.isArray(value)) {
        return value.map(stripNulls).filter((v) => v !== undefined);
    }
    if (typeof value === 'object') {
        const result: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(value)) {
            const stripped = stripNulls(val);
            if (stripped !== undefined) {
                result[key] = stripped;
            }
        }
        return result;
    }
    return value;
}

const action = createAction({
    description: 'List orders.',
    version: '1.0.0',
    endpoint: { method: 'POST', path: '/actions/list-orders' },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['store_v2_orders_read_only'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? Number(input.cursor) : 1;
        const limit = input.limit ?? 50;

        if (input.cursor !== undefined && (Number.isNaN(page) || page < 1 || !Number.isInteger(page))) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a positive integer representing the page number.'
            });
        }

        const response = await nango.get({
            // https://developer.bigcommerce.com/docs/rest-management/orders
            endpoint: '/v2/orders',
            params: {
                page: String(page),
                limit: String(limit),
                ...(input.min_date_modified !== undefined && { min_date_modified: input.min_date_modified })
            },
            retries: 3
        });

        if (response.status === 204) {
            return {
                items: []
            };
        }

        const providerOrders = z.array(ProviderOrderSchema).parse(response.data);

        const items = providerOrders.map((order) => OrderSchema.parse(stripNulls(order)));

        const hasMore = providerOrders.length === limit;

        return {
            items,
            ...(hasMore && { next_cursor: String(page + 1) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
