import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Chargebee customer ID. Example: "AzqOd0VMyUhHQZf4"')
});

const ProviderCustomerSchema = z.object({
    id: z.string(),
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    company: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    deleted: z.boolean().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().optional(),
    company: z.string().optional(),
    phone: z.string().optional(),
    deleted: z.boolean().optional()
});

const action = createAction({
    description: 'Retrieve a single customer by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://apidocs.chargebee.com/docs/api/customers
            endpoint: `/api/v2/customers/${encodeURIComponent(input.id)}`,
            retries: 3
        };

        const response = await nango.get(config);

        const ResponseSchema = z.object({
            customer: ProviderCustomerSchema
        });

        const parsed = ResponseSchema.safeParse(response.data);

        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Customer not found or invalid response',
                customer_id: input.id
            });
        }

        const providerCustomer = parsed.data.customer;

        return {
            id: providerCustomer.id,
            ...(providerCustomer.first_name != null && { first_name: providerCustomer.first_name }),
            ...(providerCustomer.last_name != null && { last_name: providerCustomer.last_name }),
            ...(providerCustomer.email != null && { email: providerCustomer.email }),
            ...(providerCustomer.company != null && { company: providerCustomer.company }),
            ...(providerCustomer.phone != null && { phone: providerCustomer.phone }),
            ...(providerCustomer.deleted != null && { deleted: providerCustomer.deleted })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
