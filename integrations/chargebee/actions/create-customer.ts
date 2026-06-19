import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const BillingAddressSchema = z.object({
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().email().optional(),
    company: z.string().optional(),
    phone: z.string().optional(),
    line1: z.string().optional(),
    line2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional()
});

const InputSchema = z.object({
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().email().optional(),
    company: z.string().optional(),
    phone: z.string().optional(),
    auto_collection: z.enum(['on', 'off']).optional(),
    net_term_days: z.number().optional(),
    locale: z.string().optional(),
    billing_address: BillingAddressSchema.optional()
});

const ProviderCustomerSchema = z
    .object({
        id: z.string(),
        first_name: z.string().nullable().optional(),
        last_name: z.string().nullable().optional(),
        email: z.string().nullable().optional(),
        company: z.string().nullable().optional(),
        phone: z.string().nullable().optional(),
        auto_collection: z.string().nullable().optional(),
        net_term_days: z.number().nullable().optional(),
        locale: z.string().nullable().optional(),
        created_at: z.number().nullable().optional(),
        deleted: z.boolean().nullable().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().optional(),
    company: z.string().optional(),
    phone: z.string().optional(),
    auto_collection: z.string().optional(),
    net_term_days: z.number().optional(),
    locale: z.string().optional(),
    created_at: z.number().optional(),
    deleted: z.boolean().optional()
});

function maybeEntry(key: string, value: string | number | undefined): [string, string | number][] {
    return value === undefined ? [] : [[key, value]];
}

const action = createAction({
    description: 'Create a new customer.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params = Object.fromEntries([
            ...maybeEntry('first_name', input.first_name),
            ...maybeEntry('last_name', input.last_name),
            ...maybeEntry('email', input.email),
            ...maybeEntry('company', input.company),
            ...maybeEntry('phone', input.phone),
            ...maybeEntry('auto_collection', input.auto_collection),
            ...maybeEntry('net_term_days', input.net_term_days),
            ...maybeEntry('locale', input.locale),
            ...(input.billing_address
                ? [
                      ...maybeEntry('billing_address[first_name]', input.billing_address.first_name),
                      ...maybeEntry('billing_address[last_name]', input.billing_address.last_name),
                      ...maybeEntry('billing_address[email]', input.billing_address.email),
                      ...maybeEntry('billing_address[company]', input.billing_address.company),
                      ...maybeEntry('billing_address[phone]', input.billing_address.phone),
                      ...maybeEntry('billing_address[line1]', input.billing_address.line1),
                      ...maybeEntry('billing_address[line2]', input.billing_address.line2),
                      ...maybeEntry('billing_address[city]', input.billing_address.city),
                      ...maybeEntry('billing_address[state]', input.billing_address.state),
                      ...maybeEntry('billing_address[zip]', input.billing_address.zip),
                      ...maybeEntry('billing_address[country]', input.billing_address.country)
                  ]
                : [])
        ]);

        const config: ProxyConfiguration = {
            // https://apidocs.chargebee.com/docs/api/customers#create_a_customer
            endpoint: '/api/v2/customers',
            params,
            retries: 10
        };

        const response = await nango.post(config);

        if (response.data == null || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Chargebee API'
            });
        }

        const raw = z.object({ customer: z.unknown() }).parse(response.data);
        const customer = ProviderCustomerSchema.parse(raw.customer);

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
            ...(customer.created_at != null && { created_at: customer.created_at }),
            ...(customer.deleted != null && { deleted: customer.deleted })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
