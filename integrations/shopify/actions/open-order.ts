import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    order_id: z.string().describe('Shopify order ID. Example: "gid://shopify/Order/123" or "123"')
});

const ProviderCustomerSchema = z.object({
    displayName: z.string().nullable().optional(),
    email: z.string().nullable().optional()
});

const ProviderOrderSchema = z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    displayFulfillmentStatus: z.string().nullable().optional(),
    displayFinancialStatus: z.string().nullable().optional(),
    createdAt: z.string().nullable().optional(),
    updatedAt: z.string().nullable().optional(),
    cancelledAt: z.string().nullable().optional(),
    cancelReason: z.string().nullable().optional(),
    confirmed: z.boolean().nullable().optional(),
    closed: z.boolean().nullable().optional(),
    closedAt: z.string().nullable().optional(),
    customer: ProviderCustomerSchema.nullable().optional()
});

const UserErrorSchema = z.object({
    field: z.array(z.string()),
    message: z.string()
});

const OutputSchema = z.object({
    order: z
        .object({
            id: z.string(),
            name: z.string().optional(),
            email: z.string().optional(),
            displayFulfillmentStatus: z.string().optional(),
            displayFinancialStatus: z.string().optional(),
            createdAt: z.string().optional(),
            updatedAt: z.string().optional(),
            cancelledAt: z.string().optional(),
            cancelReason: z.string().optional(),
            confirmed: z.boolean().optional(),
            closed: z.boolean().optional(),
            closedAt: z.string().optional(),
            customer: z
                .object({
                    displayName: z.string().optional(),
                    email: z.string().optional()
                })
                .optional()
        })
        .optional(),
    userErrors: z.array(UserErrorSchema)
});

const GraphQLResponseSchema = z.object({
    data: z.object({
        orderOpen: z.object({
            order: ProviderOrderSchema.nullable().optional(),
            userErrors: z.array(UserErrorSchema)
        })
    })
});

const action = createAction({
    description: 'Reopen a closed Shopify order',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/open-order'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_orders'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const orderId = input.order_id.startsWith('gid://') ? input.order_id : `gid://shopify/Order/${input.order_id}`;

        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/2025-10/mutations/orderOpen
            endpoint: '/admin/api/2025-10/graphql.json',
            data: {
                query: `
                    mutation orderOpen($input: OrderOpenInput!) {
                        orderOpen(input: $input) {
                            order {
                                id
                                name
                                email
                                displayFulfillmentStatus
                                displayFinancialStatus
                                createdAt
                                updatedAt
                                cancelledAt
                                cancelReason
                                confirmed
                                closed
                                closedAt
                                customer {
                                    displayName
                                    email
                                }
                            }
                            userErrors {
                                field
                                message
                            }
                        }
                    }
                `,
                variables: {
                    input: {
                        id: orderId
                    }
                }
            },
            retries: 1
        });

        const parsed = GraphQLResponseSchema.parse(response.data);
        const result = parsed.data.orderOpen;
        const providerOrder = result.order;

        return {
            order: providerOrder
                ? {
                      id: providerOrder.id,
                      ...(providerOrder.name != null && { name: providerOrder.name }),
                      ...(providerOrder.email != null && { email: providerOrder.email }),
                      ...(providerOrder.displayFulfillmentStatus != null && { displayFulfillmentStatus: providerOrder.displayFulfillmentStatus }),
                      ...(providerOrder.displayFinancialStatus != null && { displayFinancialStatus: providerOrder.displayFinancialStatus }),
                      ...(providerOrder.createdAt != null && { createdAt: providerOrder.createdAt }),
                      ...(providerOrder.updatedAt != null && { updatedAt: providerOrder.updatedAt }),
                      ...(providerOrder.cancelledAt != null && { cancelledAt: providerOrder.cancelledAt }),
                      ...(providerOrder.cancelReason != null && { cancelReason: providerOrder.cancelReason }),
                      ...(providerOrder.confirmed != null && { confirmed: providerOrder.confirmed }),
                      ...(providerOrder.closed != null && { closed: providerOrder.closed }),
                      ...(providerOrder.closedAt != null && { closedAt: providerOrder.closedAt }),
                      ...(providerOrder.customer != null && {
                          customer: {
                              ...(providerOrder.customer.displayName != null && { displayName: providerOrder.customer.displayName }),
                              ...(providerOrder.customer.email != null && { email: providerOrder.customer.email })
                          }
                      })
                  }
                : undefined,
            userErrors: result.userErrors
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
