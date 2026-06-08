import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    fulfillmentId: z.string().describe('The ID of the fulfillment to cancel. Example: "gid://shopify/Fulfillment/1234567890"')
});

const UserErrorSchema = z.object({
    field: z.array(z.string()).optional(),
    message: z.string()
});

const OutputSchema = z.object({
    status: z.string().optional(),
    userErrors: z.array(UserErrorSchema)
});

const GraphQlResponseSchema = z.object({
    data: z
        .object({
            fulfillmentCancel: z
                .object({
                    fulfillment: z
                        .object({
                            id: z.string().optional(),
                            status: z.string().optional()
                        })
                        .optional()
                        .nullable(),
                    userErrors: z.array(UserErrorSchema).optional()
                })
                .optional()
        })
        .optional(),
    errors: z.array(z.unknown()).optional()
});

const action = createAction({
    description: 'Cancel a Shopify fulfillment',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/cancel-fulfillment',
        group: 'Fulfillments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_orders', 'read_orders'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://shopify.dev/docs/api/admin-graphql/latest/mutations/fulfillmentCancel
            endpoint: '/admin/api/2026-04/graphql.json',
            data: {
                query: `
                    mutation fulfillmentCancel($id: ID!) {
                        fulfillmentCancel(id: $id) {
                            fulfillment {
                                id
                                status
                            }
                            userErrors {
                                field
                                message
                            }
                        }
                    }
                `,
                variables: {
                    id: input.fulfillmentId
                }
            },
            retries: 3
        };

        const response = await nango.post(config);

        const payload = GraphQlResponseSchema.parse(response.data);

        if (payload.errors && payload.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: 'GraphQL errors occurred',
                errors: payload.errors
            });
        }

        const fulfillmentCancel = payload.data?.fulfillmentCancel;

        if (!fulfillmentCancel) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Unexpected response from Shopify: fulfillmentCancel is missing'
            });
        }

        const userErrors = fulfillmentCancel.userErrors || [];
        const status = fulfillmentCancel.fulfillment?.status;

        return {
            status: status,
            userErrors: userErrors
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
