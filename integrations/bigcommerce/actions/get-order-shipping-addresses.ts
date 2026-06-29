import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    order_id: z.number().describe('BigCommerce order ID. Example: 100')
});

const ProviderShippingAddressSchema = z.object({
    id: z.number().describe('Shipping address ID. Example: 1'),
    order_id: z.number().describe('Order ID. Example: 100'),
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
    shipping_method: z.string().optional()
});

const ShippingAddressSchema = z.object({
    id: z.number(),
    order_id: z.number(),
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
    shipping_method: z.string().optional()
});

const OutputSchema = z.object({
    shipping_addresses: z.array(ShippingAddressSchema)
});

const action = createAction({
    description: 'List shipping addresses for an order.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['store_v2_orders_read_only'],
    endpoint: {
        method: 'POST',
        path: '/actions/get-order-shipping-addresses'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.bigcommerce.com/docs/rest-management/orders/order-shipping-addresses
            endpoint: `/v2/orders/${encodeURIComponent(input.order_id)}/shipping_addresses`,
            retries: 3
        });

        if (response.status === 204) {
            return {
                shipping_addresses: []
            };
        }

        const providerData = z.array(ProviderShippingAddressSchema).parse(response.data);

        return {
            shipping_addresses: providerData.map((address) => ({
                id: address.id,
                order_id: address.order_id,
                ...(address.first_name !== undefined && { first_name: address.first_name }),
                ...(address.last_name !== undefined && { last_name: address.last_name }),
                ...(address.company !== undefined && { company: address.company }),
                ...(address.street_1 !== undefined && { street_1: address.street_1 }),
                ...(address.street_2 !== undefined && { street_2: address.street_2 }),
                ...(address.city !== undefined && { city: address.city }),
                ...(address.state !== undefined && { state: address.state }),
                ...(address.zip !== undefined && { zip: address.zip }),
                ...(address.country !== undefined && { country: address.country }),
                ...(address.country_iso2 !== undefined && { country_iso2: address.country_iso2 }),
                ...(address.phone !== undefined && { phone: address.phone }),
                ...(address.email !== undefined && { email: address.email }),
                ...(address.shipping_method !== undefined && { shipping_method: address.shipping_method })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
