import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    fulfillmentOrderId: z.string().describe('The ID of the fulfillment order to cancel. Example: "gid://shopify/FulfillmentOrder/1046000804"'),
    message: z
        .string()
        .optional()
        .describe('An optional message. Note: the Shopify fulfillmentOrderCancel mutation does not currently accept a message parameter.')
});

const ProviderFulfillmentOrderSchema = z.object({
    id: z.string(),
    status: z.string().optional(),
    requestStatus: z.string().optional()
});

const ProviderUserErrorSchema = z.object({
    field: z.array(z.string()).optional(),
    message: z.string()
});

const OutputSchema = z.object({
    fulfillmentOrder: ProviderFulfillmentOrderSchema.optional(),
    replacementFulfillmentOrder: ProviderFulfillmentOrderSchema.optional(),
    userErrors: z.array(
        z.object({
            field: z.string().optional(),
            message: z.string()
        })
    )
});

const GraphQLResponseSchema = z.object({
    data: z
        .object({
            fulfillmentOrderCancel: z
                .object({
                    fulfillmentOrder: ProviderFulfillmentOrderSchema.nullable().optional(),
                    replacementFulfillmentOrder: ProviderFulfillmentOrderSchema.nullable().optional(),
                    userErrors: z.array(ProviderUserErrorSchema)
                })
                .optional()
        })
        .optional(),
    errors: z.array(z.object({ message: z.string() })).optional()
});

const action = createAction({
    description: 'Cancel a pending fulfillment request on a Shopify fulfillment order.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_merchant_managed_fulfillment_orders', 'write_third_party_fulfillment_orders'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/2025-07/mutations/fulfillmentOrderCancel
            endpoint: '/admin/api/2025-07/graphql.json',
            data: {
                query: `
                    mutation fulfillmentOrderCancel($id: ID!) {
                        fulfillmentOrderCancel(id: $id) {
                            fulfillmentOrder {
                                id
                                status
                                requestStatus
                            }
                            replacementFulfillmentOrder {
                                id
                                status
                                requestStatus
                            }
                            userErrors {
                                field
                                message
                            }
                        }
                    }
                `,
                variables: {
                    id: input.fulfillmentOrderId
                }
            },
            retries: 3
        });

        const parsedResponse = GraphQLResponseSchema.parse(response.data);

        if (parsedResponse.errors && parsedResponse.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: parsedResponse.errors.map((e) => e.message).join(', ')
            });
        }

        const payload = parsedResponse.data?.fulfillmentOrderCancel;
        if (!payload) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Unexpected response from Shopify: missing fulfillmentOrderCancel payload'
            });
        }

        return {
            ...(payload.fulfillmentOrder != null && { fulfillmentOrder: payload.fulfillmentOrder }),
            ...(payload.replacementFulfillmentOrder != null && { replacementFulfillmentOrder: payload.replacementFulfillmentOrder }),
            userErrors: payload.userErrors.map((userError) => ({
                ...(userError.field != null && { field: userError.field.join(', ') }),
                message: userError.message
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
