import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const CustomerSchema = z.object({
    id: z.string(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    given_name: z.string().nullable().optional(),
    family_name: z.string().nullable().optional(),
    nickname: z.string().nullable().optional(),
    company_name: z.string().nullable().optional(),
    email_address: z.string().nullable().optional(),
    address: z.record(z.string(), z.unknown()).nullable().optional(),
    phone_number: z.string().nullable().optional(),
    birthday: z.string().nullable().optional(),
    reference_id: z.string().nullable().optional(),
    note: z.string().nullable().optional(),
    preferences: z.record(z.string(), z.unknown()).nullable().optional(),
    creation_source: z.string().nullable().optional(),
    group_ids: z.array(z.string()).nullable().optional(),
    segment_ids: z.array(z.string()).nullable().optional()
});

const OutputSchema = z.object({
    customers: z.array(CustomerSchema),
    cursor: z.string().optional()
});

const ProviderResponseSchema = z.object({
    customers: z.array(z.record(z.string(), z.unknown())).optional(),
    cursor: z.string().optional(),
    errors: z.array(z.record(z.string(), z.unknown())).optional()
});

const action = createAction({
    description: 'List customers.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['CUSTOMERS_READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.squareup.com/reference/square/customers-api/list-customers
            endpoint: '/v2/customers',
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor })
            },
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        if (providerData.errors && providerData.errors.length > 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Square API returned errors.',
                errors: providerData.errors
            });
        }

        const customers = (providerData.customers || []).map((rawCustomer) => {
            const parsed = CustomerSchema.safeParse(rawCustomer);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_customer',
                    message: 'Failed to parse a customer from the Square API response.'
                });
            }
            return parsed.data;
        });

        return {
            customers,
            ...(providerData.cursor !== undefined && { cursor: providerData.cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
