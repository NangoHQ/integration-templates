import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    returnId: z.string().describe('The globally-unique ID of the return to decline. Example: gid://shopify/Return/123'),
    declineReason: z.enum(['FINAL_SALE', 'OTHER', 'RETURN_PERIOD_ENDED']).describe('The reason the return request is being declined.'),
    declineNote: z.string().max(500).optional().describe('The notification message sent to the customer about the declined return request.'),
    notifyCustomer: z.boolean().optional().describe('Whether to notify the customer when the return request is declined.')
});

const ReturnDeclineSchema = z.object({
    reason: z.string().optional(),
    note: z.string().optional()
});

const OrderSchema = z.object({
    id: z.string()
});

const ReturnSchema = z.object({
    id: z.string(),
    status: z.string(),
    name: z.string().optional(),
    decline: ReturnDeclineSchema.nullable().optional(),
    order: OrderSchema.nullable().optional()
});

const UserErrorSchema = z.object({
    code: z.string(),
    field: z.array(z.string()),
    message: z.string()
});

const OutputSchema = z.object({
    return: ReturnSchema.nullable(),
    userErrors: z.array(UserErrorSchema)
});

const action = createAction({
    description: 'Decline a return request on a Shopify order.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/decline-return',
        group: 'Returns'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_returns'],

    exec: async (nango, input) => {
        const mutation = `
            mutation ReturnDeclineRequest($input: ReturnDeclineRequestInput!) {
                returnDeclineRequest(input: $input) {
                    return {
                        id
                        status
                        name
                        decline {
                            reason
                            note
                        }
                        order {
                            id
                        }
                    }
                    userErrors {
                        code
                        field
                        message
                    }
                }
            }
        `;

        // https://shopify.dev/docs/api/admin-graphql/2025-07/mutations/returnDeclineRequest
        const response = await nango.post({
            endpoint: '/admin/api/2025-07/graphql.json',
            data: {
                query: mutation,
                variables: {
                    input: {
                        id: input.returnId,
                        declineReason: input.declineReason,
                        ...(input.declineNote !== undefined && { declineNote: input.declineNote }),
                        ...(input.notifyCustomer !== undefined && { notifyCustomer: input.notifyCustomer })
                    }
                }
            },
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            data: z.object({
                returnDeclineRequest: z.object({
                    return: ReturnSchema.nullable(),
                    userErrors: z.array(UserErrorSchema)
                })
            })
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            return: parsed.data.returnDeclineRequest.return,
            userErrors: parsed.data.returnDeclineRequest.userErrors
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
