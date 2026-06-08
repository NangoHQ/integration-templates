import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The GraphQL ID of the fulfillment order. Example: "gid://shopify/FulfillmentOrder/123"')
});

const ProviderLocationSchema = z.object({
    id: z.string(),
    name: z.string()
});

const ProviderAssignedLocationSchema = z.object({
    name: z.string(),
    location: ProviderLocationSchema.nullable().optional()
});

const ProviderDeliveryMethodSchema = z.object({
    methodType: z.string(),
    serviceCode: z.string().nullable().optional()
});

const ProviderLineItemSchema = z.object({
    id: z.string(),
    totalQuantity: z.number().int(),
    remainingQuantity: z.number().int(),
    lineItem: z
        .object({
            id: z.string(),
            title: z.string()
        })
        .nullable()
        .optional()
});

const ProviderFulfillmentOrderSchema = z.object({
    id: z.string(),
    status: z.string(),
    requestStatus: z.string(),
    assignedLocation: ProviderAssignedLocationSchema,
    deliveryMethod: ProviderDeliveryMethodSchema.nullable().optional(),
    lineItems: z.object({
        edges: z.array(z.object({ node: ProviderLineItemSchema }))
    })
});

const GraphQLResponseSchema = z.object({
    data: z
        .object({
            fulfillmentOrder: ProviderFulfillmentOrderSchema.nullable().optional()
        })
        .optional(),
    errors: z
        .array(
            z.object({
                message: z.string(),
                extensions: z.record(z.string(), z.unknown()).optional()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    status: z.string(),
    requestStatus: z.string(),
    assignedLocation: z
        .object({
            name: z.string().optional(),
            location: z
                .object({
                    id: z.string(),
                    name: z.string()
                })
                .optional()
        })
        .optional(),
    deliveryMethod: z
        .object({
            methodType: z.string().optional(),
            serviceCode: z.string().optional()
        })
        .optional(),
    lineItems: z
        .array(
            z.object({
                id: z.string(),
                totalQuantity: z.number().int(),
                remainingQuantity: z.number().int(),
                lineItem: z
                    .object({
                        id: z.string(),
                        title: z.string()
                    })
                    .optional()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Retrieve a Shopify fulfillment order by GraphQL ID.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-fulfillment-order',
        group: 'Fulfillment Orders'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_merchant_managed_fulfillment_orders', 'read_assigned_fulfillment_orders', 'read_third_party_fulfillment_orders'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/2025-01/queries/fulfillmentOrder
            endpoint: '/admin/api/2025-01/graphql.json',
            data: {
                query: `
                    query GetFulfillmentOrder($id: ID!) {
                        fulfillmentOrder(id: $id) {
                            id
                            status
                            requestStatus
                            assignedLocation {
                                name
                                location {
                                    id
                                    name
                                }
                            }
                            deliveryMethod {
                                methodType
                                serviceCode
                            }
                            lineItems(first: 250) {
                                edges {
                                    node {
                                        id
                                        totalQuantity
                                        remainingQuantity
                                        lineItem {
                                            id
                                            title
                                        }
                                    }
                                }
                            }
                        }
                    }
                `,
                variables: {
                    id: input.id
                }
            },
            retries: 3
        });

        const parsed = GraphQLResponseSchema.parse(response.data);

        if (parsed.errors && parsed.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: parsed.errors.map((error) => error.message).join(', '),
                id: input.id
            });
        }

        const fulfillmentOrder = parsed.data?.fulfillmentOrder;
        if (!fulfillmentOrder) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Fulfillment order not found',
                id: input.id
            });
        }

        return {
            id: fulfillmentOrder.id,
            status: fulfillmentOrder.status,
            requestStatus: fulfillmentOrder.requestStatus,
            assignedLocation: {
                name: fulfillmentOrder.assignedLocation.name,
                ...(fulfillmentOrder.assignedLocation.location != null && {
                    location: {
                        id: fulfillmentOrder.assignedLocation.location.id,
                        name: fulfillmentOrder.assignedLocation.location.name
                    }
                })
            },
            ...(fulfillmentOrder.deliveryMethod != null && {
                deliveryMethod: {
                    methodType: fulfillmentOrder.deliveryMethod.methodType,
                    ...(fulfillmentOrder.deliveryMethod.serviceCode != null && {
                        serviceCode: fulfillmentOrder.deliveryMethod.serviceCode
                    })
                }
            }),
            lineItems: fulfillmentOrder.lineItems.edges.map(({ node: item }) => ({
                id: item.id,
                totalQuantity: item.totalQuantity,
                remainingQuantity: item.remainingQuantity,
                ...(item.lineItem != null && {
                    lineItem: {
                        id: item.lineItem.id,
                        title: item.lineItem.title
                    }
                })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
