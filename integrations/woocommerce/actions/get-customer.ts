import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Customer ID. Example: 2')
});

const BillingAddressSchema = z.object({
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

const ShippingAddressSchema = z.object({
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

const MetaDataItemSchema = z.object({
    id: z.number().optional(),
    key: z.string().optional(),
    value: z.unknown().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    date_created: z.string().optional(),
    date_created_gmt: z.string().optional(),
    date_modified: z.string().optional(),
    date_modified_gmt: z.string().optional(),
    email: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    role: z.string().optional(),
    username: z.string().optional(),
    billing: BillingAddressSchema.optional(),
    shipping: ShippingAddressSchema.optional(),
    is_paying_customer: z.boolean().optional(),
    avatar_url: z.string().optional(),
    meta_data: z.array(MetaDataItemSchema).optional()
});

const action = createAction({
    description: 'Retrieve a single customer from WooCommerce.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://woocommerce.github.io/woocommerce-rest-api-docs/#retrieve-a-customer
            endpoint: `/wp-json/wc/v3/customers/${encodeURIComponent(String(input.id))}`,
            retries: 3
        };

        const response = await nango.get(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Customer not found',
                id: input.id
            });
        }

        const customer = OutputSchema.parse(response.data);

        return customer;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
