import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    fulfillmentOrderId: z.string().describe('The ID of the fulfillment order to be moved. Example: "gid://shopify/FulfillmentOrder/940656279"'),
    newLocationId: z.string().describe('The ID of the location where the fulfillment order will be moved. Example: "gid://shopify/Location/346779380"')
});

const LocationSchema = z.object({
    name: z.string().optional()
});

const FulfillmentOrderSchema = z.object({
    id: z.string(),
    status: z.string().optional(),
    requestStatus: z.string().optional(),
    assignedLocation: LocationSchema.optional()
});

const UserErrorSchema = z.object({
    field: z.array(z.string()).optional(),
    message: z.string().optional()
});

const OutputSchema = z.object({
    originalFulfillmentOrder: FulfillmentOrderSchema.nullable().optional(),
    movedFulfillmentOrder: FulfillmentOrderSchema.nullable().optional(),
    remainingFulfillmentOrder: FulfillmentOrderSchema.nullable().optional(),
    userErrors: z.array(UserErrorSchema).optional()
});

const action = createAction({
    description: 'Move a Shopify fulfillment order to a different location.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/move-fulfillment-order',
        group: 'Fulfillments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_merchant_managed_fulfillment_orders', 'write_third_party_fulfillment_orders'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            mutation fulfillmentOrderMove($id: ID!, $newLocationId: ID!) {
                fulfillmentOrderMove(id: $id, newLocationId: $newLocationId) {
                    originalFulfillmentOrder {
                        id
                        status
                        requestStatus
                        assignedLocation {
                            name
                        }
                    }
                    movedFulfillmentOrder {
                        id
                        status
                        requestStatus
                        assignedLocation {
                            name
                        }
                    }
                    remainingFulfillmentOrder {
                        id
                        status
                        requestStatus
                        assignedLocation {
                            name
                        }
                    }
                    userErrors {
                        field
                        message
                    }
                }
            }
        `;

        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/2025-04/mutations/fulfillmentOrderMove
            endpoint: '/admin/api/2025-04/graphql.json',
            data: {
                query,
                variables: {
                    id: input.fulfillmentOrderId,
                    newLocationId: input.newLocationId
                }
            },
            retries: 3
        });

        const body = z
            .object({
                data: z.record(z.string(), z.unknown()).nullable().optional(),
                errors: z.unknown().array().optional()
            })
            .parse(response.data);

        if (body.errors && body.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: 'GraphQL error occurred while moving fulfillment order',
                errors: body.errors
            });
        }

        const payload = z
            .object({
                fulfillmentOrderMove: z.object({
                    originalFulfillmentOrder: FulfillmentOrderSchema.nullable().optional(),
                    movedFulfillmentOrder: FulfillmentOrderSchema.nullable().optional(),
                    remainingFulfillmentOrder: FulfillmentOrderSchema.nullable().optional(),
                    userErrors: z.array(UserErrorSchema).optional()
                })
            })
            .parse(body.data);

        const result = payload.fulfillmentOrderMove;

        return {
            originalFulfillmentOrder: result.originalFulfillmentOrder,
            movedFulfillmentOrder: result.movedFulfillmentOrder,
            remainingFulfillmentOrder: result.remainingFulfillmentOrder,
            userErrors: result.userErrors
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
