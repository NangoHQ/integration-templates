import { z } from 'zod';
import { createAction } from 'nango';

const FulfillmentOrderLineItemInputSchema = z.object({
    id: z.string().describe('The ID of the fulfillment order line item.'),
    quantity: z.number().int().describe('The quantity of the fulfillment order line item.')
});

const InputSchema = z.object({
    id: z.string().describe('The ID of the fulfillment order to submit for fulfillment.'),
    fulfillmentOrderLineItems: z
        .array(FulfillmentOrderLineItemInputSchema)
        .optional()
        .describe('The fulfillment order line items to be requested for fulfillment. If omitted, all line items are requested.'),
    notifyCustomer: z.boolean().optional().describe('Whether the customer should be notified when fulfillments are created.')
});

const FulfillmentOrderSchema = z.object({
    id: z.string(),
    status: z.string(),
    requestStatus: z.string()
});

const UserErrorSchema = z.object({
    field: z.array(z.string()).optional(),
    message: z.string()
});

const OutputSchema = z.object({
    originalFulfillmentOrder: FulfillmentOrderSchema,
    submittedFulfillmentOrder: FulfillmentOrderSchema,
    unsubmittedFulfillmentOrder: FulfillmentOrderSchema.optional(),
    userErrors: z.array(UserErrorSchema)
});

const action = createAction({
    description: 'Submit a fulfillment request to a third-party fulfillment service.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_third_party_fulfillment_orders'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const mutation = `
            mutation fulfillmentOrderSubmitFulfillmentRequest(
                $id: ID!
                $fulfillmentOrderLineItems: [FulfillmentOrderLineItemInput!]
                $notifyCustomer: Boolean
            ) {
                fulfillmentOrderSubmitFulfillmentRequest(
                    id: $id
                    fulfillmentOrderLineItems: $fulfillmentOrderLineItems
                    notifyCustomer: $notifyCustomer
                ) {
                    originalFulfillmentOrder {
                        id
                        status
                        requestStatus
                    }
                    submittedFulfillmentOrder {
                        id
                        status
                        requestStatus
                    }
                    unsubmittedFulfillmentOrder {
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
        `;

        const variables = {
            id: input.id,
            ...(input.fulfillmentOrderLineItems !== undefined && {
                fulfillmentOrderLineItems: input.fulfillmentOrderLineItems
            }),
            ...(input.notifyCustomer !== undefined && { notifyCustomer: input.notifyCustomer })
        };

        // https://shopify.dev/docs/api/admin-graphql/2025-07/mutations/fulfillmentOrderSubmitFulfillmentRequest
        const response = await nango.post({
            endpoint: '/admin/api/2025-07/graphql.json',
            data: {
                query: mutation,
                variables
            },
            retries: 3
        });

        const graphqlBody = z
            .object({
                data: z.unknown().optional(),
                errors: z
                    .array(
                        z.object({
                            message: z.string(),
                            extensions: z.unknown().optional()
                        })
                    )
                    .optional()
            })
            .parse(response.data);

        if (graphqlBody.errors && graphqlBody.errors.length > 0) {
            const firstError = graphqlBody.errors[0];
            if (firstError) {
                throw new nango.ActionError({
                    type: 'graphql_error',
                    message: firstError.message,
                    errors: graphqlBody.errors
                });
            }
        }

        if (!graphqlBody.data) {
            throw new nango.ActionError({
                type: 'missing_data',
                message: 'The GraphQL response did not contain data.'
            });
        }

        const payload = z
            .object({
                fulfillmentOrderSubmitFulfillmentRequest: z.object({
                    originalFulfillmentOrder: FulfillmentOrderSchema.nullable(),
                    submittedFulfillmentOrder: FulfillmentOrderSchema.nullable(),
                    unsubmittedFulfillmentOrder: FulfillmentOrderSchema.nullable().optional(),
                    userErrors: z.array(UserErrorSchema)
                })
            })
            .parse(graphqlBody.data);

        const result = payload.fulfillmentOrderSubmitFulfillmentRequest;

        if (result.userErrors.length > 0) {
            throw new nango.ActionError({
                type: 'user_error',
                message: 'The mutation returned user errors.',
                userErrors: result.userErrors
            });
        }

        if (!result.originalFulfillmentOrder || !result.submittedFulfillmentOrder) {
            throw new nango.ActionError({
                type: 'missing_data',
                message: 'The mutation response did not include the expected fulfillment orders.'
            });
        }

        return {
            originalFulfillmentOrder: result.originalFulfillmentOrder,
            submittedFulfillmentOrder: result.submittedFulfillmentOrder,
            ...(result.unsubmittedFulfillmentOrder != null && {
                unsubmittedFulfillmentOrder: result.unsubmittedFulfillmentOrder
            }),
            userErrors: result.userErrors
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
