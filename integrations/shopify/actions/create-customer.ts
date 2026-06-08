import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const AddressInputSchema = z.object({
    address1: z.string().optional(),
    address2: z.string().optional(),
    city: z.string().optional(),
    company: z.string().optional(),
    countryCode: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phone: z.string().optional(),
    provinceCode: z.string().optional(),
    zip: z.string().optional()
});

const InputSchema = z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    tags: z.array(z.string()).optional(),
    addresses: z.array(AddressInputSchema).optional(),
    taxExempt: z.boolean().optional(),
    note: z.string().optional(),
    locale: z.string().optional()
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Create a Shopify customer record.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-customer',
        group: 'Customers'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_customers'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            mutation customerCreate($input: CustomerInput!) {
                customerCreate(input: $input) {
                    userErrors {
                        field
                        message
                    }
                }
            }
        `;

        const variables = {
            input: {
                ...(input.firstName !== undefined && { firstName: input.firstName }),
                ...(input.lastName !== undefined && { lastName: input.lastName }),
                ...(input.email !== undefined && { email: input.email }),
                ...(input.phone !== undefined && { phone: input.phone }),
                ...(input.tags !== undefined && { tags: input.tags }),
                ...(input.addresses !== undefined && { addresses: input.addresses }),
                ...(input.taxExempt !== undefined && { taxExempt: input.taxExempt }),
                ...(input.note !== undefined && { note: input.note }),
                ...(input.locale !== undefined && { locale: input.locale })
            }
        };

        const config: ProxyConfiguration = {
            // https://shopify.dev/docs/api/admin-graphql/2025-10/mutations/customerCreate
            endpoint: '/admin/api/2025-10/graphql.json',
            data: {
                query,
                variables
            },
            retries: 1
        };

        const response = await nango.post(config);

        const BodySchema = z.object({
            data: z.object({
                customerCreate: z
                    .object({
                        userErrors: z.array(
                            z.object({
                                field: z.union([z.string(), z.array(z.string())]).nullable(),
                                message: z.string()
                            })
                        )
                    })
                    .nullable()
            }),
            errors: z.array(z.unknown()).optional()
        });

        const parsedBody = BodySchema.safeParse(response.data);
        if (!parsedBody.success) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Unexpected response structure from Shopify'
            });
        }

        const body = parsedBody.data;

        if (body.errors && body.errors.length > 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'GraphQL errors occurred during customer creation'
            });
        }

        if (!body.data.customerCreate) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'No customer creation response from Shopify'
            });
        }

        if (body.data.customerCreate.userErrors.length > 0) {
            throw new nango.ActionError({
                type: 'validation_error',
                message: body.data.customerCreate.userErrors.map((e) => e.message).join(', '),
                errors: body.data.customerCreate.userErrors
            });
        }

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
