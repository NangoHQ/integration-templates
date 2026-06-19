import { z } from 'zod';
import { createAction } from 'nango';

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

const InputSchema = z.object({
    id: z.number().describe('Unique identifier for the customer. Example: 2'),
    email: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    billing: BillingAddressSchema.optional(),
    shipping: ShippingAddressSchema.optional(),
    meta_data: z.array(MetaDataItemSchema).optional()
});

const OutputSchema = z.object({
    id: z.number(),
    email: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    username: z.string().optional(),
    billing: BillingAddressSchema.optional(),
    shipping: ShippingAddressSchema.optional(),
    avatar_url: z.string().optional(),
    is_paying_customer: z.boolean().optional(),
    date_created: z.string().optional(),
    date_created_gmt: z.string().optional(),
    date_modified: z.string().optional(),
    date_modified_gmt: z.string().optional(),
    role: z.string().optional(),
    meta_data: z.array(MetaDataItemSchema).optional()
});

const action = createAction({
    description: 'Update a customer in WooCommerce.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.patch({
            // https://woocommerce.github.io/woocommerce-rest-api-docs/#update-a-customer
            endpoint: `/wp-json/wc/v3/customers/${encodeURIComponent(String(input.id))}`,
            data: {
                ...(input.email !== undefined && { email: input.email }),
                ...(input.first_name !== undefined && { first_name: input.first_name }),
                ...(input.last_name !== undefined && { last_name: input.last_name }),
                ...(input.username !== undefined && { username: input.username }),
                ...(input.password !== undefined && { password: input.password }),
                ...(input.billing !== undefined && { billing: input.billing }),
                ...(input.shipping !== undefined && { shipping: input.shipping }),
                ...(input.meta_data !== undefined && { meta_data: input.meta_data })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Customer not found or update failed',
                id: input.id
            });
        }

        const providerCustomer = OutputSchema.parse(response.data);

        return providerCustomer;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
