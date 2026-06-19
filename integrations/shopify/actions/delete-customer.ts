import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    customerId: z.string().describe('The GID of the customer to delete. Example: gid://shopify/Customer/1234567890')
});

const UserErrorSchema = z.object({
    field: z.array(z.string()).optional(),
    message: z.string()
});

const OutputSchema = z.object({
    deleted: z.boolean(),
    deletedCustomerId: z.string().optional(),
    userErrors: z.array(UserErrorSchema).optional()
});

const action = createAction({
    description: 'Delete a Shopify customer record.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_customers'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            mutation customerDelete($id: ID!) {
                customerDelete(input: {id: $id}) {
                    deletedCustomerId
                    userErrors {
                        field
                        message
                    }
                }
            }
        `;

        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/2025-04/mutations/customerDelete
            endpoint: '/admin/api/2025-04/graphql.json',
            data: {
                query,
                variables: {
                    id: input.customerId
                }
            },
            retries: 3
        });

        const graphQLResponse = z
            .object({
                data: z
                    .object({
                        customerDelete: z.object({
                            deletedCustomerId: z.string().nullable().optional(),
                            userErrors: z.array(
                                z.object({
                                    field: z.array(z.string()).optional(),
                                    message: z.string()
                                })
                            )
                        })
                    })
                    .nullable()
                    .optional(),
                errors: z.array(z.object({ message: z.string() })).optional()
            })
            .parse(response.data);

        if (graphQLResponse.errors?.length) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: graphQLResponse.errors.map((e) => e.message).join('; ')
            });
        }

        if (!graphQLResponse.data) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Shopify: missing data.'
            });
        }

        const result = graphQLResponse.data.customerDelete;
        const deleted = result.deletedCustomerId != null && result.userErrors.length === 0;

        return {
            deleted,
            ...(result.deletedCustomerId != null && { deletedCustomerId: result.deletedCustomerId }),
            ...(result.userErrors.length > 0 && { userErrors: result.userErrors })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
