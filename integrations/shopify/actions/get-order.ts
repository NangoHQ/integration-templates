import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The GraphQL ID of the order. Example: "gid://shopify/Order/1234567890"')
});

const ProviderOrderResponseSchema = z.object({
    data: z.object({
        order: z
            .object({
                id: z.string(),
                name: z.string(),
                createdAt: z.string(),
                updatedAt: z.string().optional().nullable(),
                displayFinancialStatus: z.string().optional().nullable(),
                displayFulfillmentStatus: z.string(),
                customer: z
                    .object({
                        id: z.string(),
                        firstName: z.string().optional().nullable(),
                        lastName: z.string().optional().nullable(),
                        email: z.string().optional().nullable()
                    })
                    .optional()
                    .nullable(),
                lineItems: z.object({
                    edges: z.array(
                        z.object({
                            node: z.object({
                                id: z.string(),
                                title: z.string(),
                                quantity: z.number(),
                                variant: z
                                    .object({
                                        id: z.string(),
                                        title: z.string().optional().nullable()
                                    })
                                    .optional()
                                    .nullable()
                            })
                        })
                    )
                })
            })
            .optional()
            .nullable()
    }),
    errors: z.array(z.object({ message: z.string() })).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    createdAt: z.string(),
    updatedAt: z.string().optional(),
    displayFinancialStatus: z.string().optional(),
    displayFulfillmentStatus: z.string(),
    customer: z
        .object({
            id: z.string(),
            firstName: z.string().optional(),
            lastName: z.string().optional(),
            email: z.string().optional()
        })
        .optional(),
    lineItems: z.array(
        z.object({
            id: z.string(),
            title: z.string(),
            quantity: z.number(),
            variant: z
                .object({
                    id: z.string(),
                    title: z.string().optional()
                })
                .optional()
        })
    )
});

const action = createAction({
    description: 'Retrieve a Shopify order by GraphQL ID.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-order',
        group: 'Orders'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_orders'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://shopify.dev/docs/api/admin-graphql/2025-01/queries/order
            endpoint: 'admin/api/2025-01/graphql.json',
            data: {
                query: `
                    query GetOrder($id: ID!) {
                        order(id: $id) {
                            id
                            name
                            createdAt
                            updatedAt
                            displayFinancialStatus
                            displayFulfillmentStatus
                            customer {
                                id
                                firstName
                                lastName
                                email
                            }
                            lineItems(first: 50) {
                                edges {
                                    node {
                                        id
                                        title
                                        quantity
                                        variant {
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
        };

        const response = await nango.post(config);

        const providerResponse = ProviderOrderResponseSchema.parse(response.data);

        if (providerResponse.errors && providerResponse.errors.length > 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.errors.map((err) => err.message).join('; ')
            });
        }

        const order = providerResponse.data.order;

        if (!order) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Order not found',
                id: input.id
            });
        }

        return {
            id: order.id,
            name: order.name,
            createdAt: order.createdAt,
            ...(order.updatedAt != null && { updatedAt: order.updatedAt }),
            ...(order.displayFinancialStatus != null && { displayFinancialStatus: order.displayFinancialStatus }),
            displayFulfillmentStatus: order.displayFulfillmentStatus,
            ...(order.customer != null && {
                customer: {
                    id: order.customer.id,
                    ...(order.customer.firstName != null && { firstName: order.customer.firstName }),
                    ...(order.customer.lastName != null && { lastName: order.customer.lastName }),
                    ...(order.customer.email != null && { email: order.customer.email })
                }
            }),
            lineItems: order.lineItems.edges.map((edge) => ({
                id: edge.node.id,
                title: edge.node.title,
                quantity: edge.node.quantity,
                ...(edge.node.variant != null && {
                    variant: {
                        id: edge.node.variant.id,
                        ...(edge.node.variant.title != null && { title: edge.node.variant.title })
                    }
                })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
