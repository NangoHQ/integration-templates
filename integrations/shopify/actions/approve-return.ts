import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    return_id: z.string().describe('The globally-unique ID of the return to approve. Example: "gid://shopify/Return/945000959"'),
    notify_customer: z.boolean().optional().describe('Whether to notify the customer when the return request is approved.')
});

const ReturnLineItemNodeSchema = z.object({
    id: z.string()
});

const ReturnLineItemEdgeSchema = z.object({
    node: ReturnLineItemNodeSchema
});

const ReturnLineItemConnectionSchema = z.object({
    edges: z.array(ReturnLineItemEdgeSchema)
});

const OrderSchema = z.object({
    id: z.string()
});

const ProviderReturnSchema = z.object({
    id: z.string(),
    name: z.string(),
    status: z.string(),
    createdAt: z.string().optional(),
    returnLineItems: ReturnLineItemConnectionSchema.optional(),
    order: OrderSchema
});

const ProviderUserErrorSchema = z.object({
    code: z.string().optional(),
    field: z.array(z.string()).optional(),
    message: z.string()
});

const ProviderPayloadSchema = z.object({
    returnApproveRequest: z.object({
        return: ProviderReturnSchema.nullable(),
        userErrors: z.array(ProviderUserErrorSchema)
    })
});

const ReturnOutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    status: z.string(),
    created_at: z.string().optional(),
    order_id: z.string()
});

const UserErrorOutputSchema = z.object({
    code: z.string().optional(),
    field: z.array(z.string()).optional(),
    message: z.string()
});

const OutputSchema = z.object({
    return: ReturnOutputSchema.nullable(),
    user_errors: z.array(UserErrorOutputSchema)
});

const action = createAction({
    description: 'Approve a return request on a Shopify order.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_returns'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/2025-07/mutations/returnApproveRequest
            endpoint: 'admin/api/2025-07/graphql.json',
            data: {
                query: `
                    mutation ReturnApproveRequest($input: ReturnApproveRequestInput!) {
                        returnApproveRequest(input: $input) {
                            return {
                                id
                                name
                                status
                                createdAt
                                returnLineItems(first: 5) {
                                    edges {
                                        node {
                                            id
                                        }
                                    }
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
                `,
                variables: {
                    input: {
                        id: input.return_id,
                        ...(input.notify_customer !== undefined && { notifyCustomer: input.notify_customer })
                    }
                }
            },
            retries: 1
        });

        const responseBody = z
            .object({
                data: ProviderPayloadSchema
            })
            .parse(response.data);
        const result = responseBody.data.returnApproveRequest;

        const providerReturn = result.return;

        return {
            return: providerReturn
                ? {
                      id: providerReturn.id,
                      name: providerReturn.name,
                      status: providerReturn.status,
                      ...(providerReturn.createdAt !== undefined && { created_at: providerReturn.createdAt }),
                      order_id: providerReturn.order.id
                  }
                : null,
            user_errors: result.userErrors.map((error) => ({
                ...(error.code !== undefined && { code: error.code }),
                ...(error.field !== undefined && { field: error.field }),
                message: error.message
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
