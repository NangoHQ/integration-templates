import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The GID of the customer to update. Example: gid://shopify/Customer/1234567890'),
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    note: z.string().nullable().optional(),
    tags: z.array(z.string()).nullable().optional()
});

const ProviderUserErrorSchema = z.object({
    field: z.array(z.string()).optional(),
    message: z.string()
});

const ProviderCustomerSchema = z.object({
    id: z.string(),
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    note: z.string().nullable().optional(),
    tags: z.array(z.string()).nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    note: z.string().optional(),
    tags: z.array(z.string()).optional()
});

const GraphQLResponseSchema = z.object({
    data: z
        .object({
            customerUpdate: z
                .object({
                    customer: z.unknown().nullable().optional(),
                    userErrors: z.array(z.unknown()).optional()
                })
                .optional()
        })
        .optional(),
    errors: z
        .array(
            z.object({
                message: z.string()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Update a Shopify customer.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_customers'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const mutation = `
            mutation customerUpdate($input: CustomerInput!) {
                customerUpdate(input: $input) {
                    customer {
                        id
                        firstName
                        lastName
                        email
                        phone
                        note
                        tags
                    }
                    userErrors {
                        field
                        message
                    }
                }
            }
        `;

        const variables = {
            input: {
                id: input.id,
                ...(input.firstName !== undefined && { firstName: input.firstName }),
                ...(input.lastName !== undefined && { lastName: input.lastName }),
                ...(input.email !== undefined && { email: input.email }),
                ...(input.phone !== undefined && { phone: input.phone }),
                ...(input.note !== undefined && { note: input.note }),
                ...(input.tags !== undefined && { tags: input.tags })
            }
        };

        // https://shopify.dev/docs/api/admin-graphql/2025-04/mutations/customerUpdate
        const response = await nango.post({
            endpoint: '/admin/api/2025-04/graphql.json',
            data: {
                query: mutation,
                variables
            },
            retries: 3
        });

        const responseData = GraphQLResponseSchema.parse(response.data);

        const firstError = responseData.errors?.[0];
        if (firstError) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: firstError.message
            });
        }

        const payload = responseData.data?.customerUpdate;

        if (!payload) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Unexpected response from Shopify.'
            });
        }

        const userErrors = z.array(ProviderUserErrorSchema).parse(payload.userErrors || []);

        if (userErrors.length > 0) {
            throw new nango.ActionError({
                type: 'validation_error',
                message: userErrors.map((err) => err.message).join(', '),
                errors: userErrors
            });
        }

        if (!payload.customer) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Customer not found for id ${input.id}`
            });
        }

        const customer = ProviderCustomerSchema.parse(payload.customer);

        return {
            id: customer.id,
            ...(customer.firstName != null && { firstName: customer.firstName }),
            ...(customer.lastName != null && { lastName: customer.lastName }),
            ...(customer.email != null && { email: customer.email }),
            ...(customer.phone != null && { phone: customer.phone }),
            ...(customer.note != null && { note: customer.note }),
            ...(customer.tags != null && { tags: customer.tags })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
