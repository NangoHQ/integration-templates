import { z } from 'zod';
import { createAction } from 'nango';

const BillingAddressInputSchema = z
    .object({
        first_name: z.string().optional(),
        last_name: z.string().optional(),
        email: z.string().optional(),
        company: z.string().optional(),
        phone: z.string().optional(),
        line1: z.string().optional(),
        line2: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zip: z.string().optional(),
        country: z.string().optional()
    })
    .optional();

const InputSchema = z.object({
    customer_id: z.string().describe('Chargebee customer ID. Example: "AzqOd0VMyUhHQZf4"'),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().optional(),
    company: z.string().optional(),
    phone: z.string().optional(),
    auto_collection: z.enum(['on', 'off']).optional(),
    net_term_days: z.number().optional(),
    locale: z.string().optional(),
    billing_address: BillingAddressInputSchema
});

const CustomerSchema = z
    .object({
        id: z.string(),
        first_name: z.string().optional().nullable(),
        last_name: z.string().optional().nullable(),
        email: z.string().optional().nullable(),
        company: z.string().optional().nullable(),
        phone: z.string().optional().nullable(),
        auto_collection: z.enum(['on', 'off']).optional().nullable(),
        net_term_days: z.number().optional().nullable(),
        locale: z.string().optional().nullable(),
        billing_address: z
            .object({
                first_name: z.string().optional().nullable(),
                last_name: z.string().optional().nullable(),
                email: z.string().optional().nullable(),
                company: z.string().optional().nullable(),
                phone: z.string().optional().nullable(),
                line1: z.string().optional().nullable(),
                line2: z.string().optional().nullable(),
                city: z.string().optional().nullable(),
                state: z.string().optional().nullable(),
                zip: z.string().optional().nullable(),
                country: z.string().optional().nullable()
            })
            .optional()
            .nullable()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().optional(),
    company: z.string().optional(),
    phone: z.string().optional(),
    auto_collection: z.enum(['on', 'off']).optional(),
    net_term_days: z.number().optional(),
    locale: z.string().optional(),
    billing_address: z
        .object({
            first_name: z.string().optional(),
            last_name: z.string().optional(),
            email: z.string().optional(),
            company: z.string().optional(),
            phone: z.string().optional(),
            line1: z.string().optional(),
            line2: z.string().optional(),
            city: z.string().optional(),
            state: z.string().optional(),
            zip: z.string().optional(),
            country: z.string().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Update a customer.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};

        if (input.first_name !== undefined) {
            params['first_name'] = input.first_name;
        }
        if (input.last_name !== undefined) {
            params['last_name'] = input.last_name;
        }
        if (input.email !== undefined) {
            params['email'] = input.email;
        }
        if (input.company !== undefined) {
            params['company'] = input.company;
        }
        if (input.phone !== undefined) {
            params['phone'] = input.phone;
        }
        if (input.auto_collection !== undefined) {
            params['auto_collection'] = input.auto_collection;
        }
        if (input.net_term_days !== undefined) {
            params['net_term_days'] = input.net_term_days;
        }
        if (input.locale !== undefined) {
            params['locale'] = input.locale;
        }

        if (input.billing_address) {
            const ba = input.billing_address;
            if (ba.first_name !== undefined) {
                params['billing_address[first_name]'] = ba.first_name;
            }
            if (ba.last_name !== undefined) {
                params['billing_address[last_name]'] = ba.last_name;
            }
            if (ba.email !== undefined) {
                params['billing_address[email]'] = ba.email;
            }
            if (ba.company !== undefined) {
                params['billing_address[company]'] = ba.company;
            }
            if (ba.phone !== undefined) {
                params['billing_address[phone]'] = ba.phone;
            }
            if (ba.line1 !== undefined) {
                params['billing_address[line1]'] = ba.line1;
            }
            if (ba.line2 !== undefined) {
                params['billing_address[line2]'] = ba.line2;
            }
            if (ba.city !== undefined) {
                params['billing_address[city]'] = ba.city;
            }
            if (ba.state !== undefined) {
                params['billing_address[state]'] = ba.state;
            }
            if (ba.zip !== undefined) {
                params['billing_address[zip]'] = ba.zip;
            }
            if (ba.country !== undefined) {
                params['billing_address[country]'] = ba.country;
            }
        }

        const response = await nango.post({
            // https://apidocs.chargebee.com/docs/api/customers?lang=curl#update_a_customer
            endpoint: `/api/v2/customers/${encodeURIComponent(input.customer_id)}`,
            params,
            retries: 3
        });

        const customerResponse = z
            .object({
                customer: CustomerSchema
            })
            .parse(response.data);

        const customer = customerResponse.customer;

        return {
            id: customer.id,
            ...(customer.first_name != null && { first_name: customer.first_name }),
            ...(customer.last_name != null && { last_name: customer.last_name }),
            ...(customer.email != null && { email: customer.email }),
            ...(customer.company != null && { company: customer.company }),
            ...(customer.phone != null && { phone: customer.phone }),
            ...(customer.auto_collection != null && { auto_collection: customer.auto_collection }),
            ...(customer.net_term_days != null && { net_term_days: customer.net_term_days }),
            ...(customer.locale != null && { locale: customer.locale }),
            ...(customer.billing_address != null && {
                billing_address: {
                    ...(customer.billing_address.first_name != null && { first_name: customer.billing_address.first_name }),
                    ...(customer.billing_address.last_name != null && { last_name: customer.billing_address.last_name }),
                    ...(customer.billing_address.email != null && { email: customer.billing_address.email }),
                    ...(customer.billing_address.company != null && { company: customer.billing_address.company }),
                    ...(customer.billing_address.phone != null && { phone: customer.billing_address.phone }),
                    ...(customer.billing_address.line1 != null && { line1: customer.billing_address.line1 }),
                    ...(customer.billing_address.line2 != null && { line2: customer.billing_address.line2 }),
                    ...(customer.billing_address.city != null && { city: customer.billing_address.city }),
                    ...(customer.billing_address.state != null && { state: customer.billing_address.state }),
                    ...(customer.billing_address.zip != null && { zip: customer.billing_address.zip }),
                    ...(customer.billing_address.country != null && { country: customer.billing_address.country })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
