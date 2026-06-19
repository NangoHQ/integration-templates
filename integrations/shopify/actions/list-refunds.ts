import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    order_id: z.string().describe('The Shopify order ID. Can be a numeric ID or a GID like "gid://shopify/Order/1234567890". Example: "1234567890"')
});

const MoneyV2Schema = z.object({
    amount: z.string(),
    currencyCode: z.string()
});

const MoneyBagSchema = z.object({
    shopMoney: MoneyV2Schema,
    presentmentMoney: MoneyV2Schema
});

const LineItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    title: z.string(),
    variantTitle: z.string().nullable().optional(),
    sku: z.string().nullable().optional()
});

const LocationSchema = z.object({
    id: z.string(),
    name: z.string()
});

const RefundLineItemSchema = z.object({
    id: z.string(),
    quantity: z.number(),
    restocked: z.boolean(),
    restockType: z.string(),
    lineItem: LineItemSchema,
    location: LocationSchema.nullable().optional(),
    priceSet: MoneyBagSchema,
    subtotalSet: MoneyBagSchema,
    totalTaxSet: MoneyBagSchema
});

const TransactionSchema = z.object({
    id: z.string(),
    kind: z.string(),
    status: z.string(),
    gateway: z.string().nullable().optional(),
    createdAt: z.string().nullable().optional(),
    processedAt: z.string().nullable().optional(),
    amountSet: MoneyBagSchema
});

const RefundDutySchema = z.object({
    amountSet: MoneyBagSchema,
    originalDuty: z
        .object({
            id: z.string()
        })
        .nullable()
        .optional()
});

const RefundSchema = z.object({
    id: z.string(),
    createdAt: z.string().nullable().optional(),
    note: z.string().nullable().optional(),
    refundLineItems: z.array(RefundLineItemSchema),
    transactions: z.array(TransactionSchema),
    duties: z.array(RefundDutySchema),
    totalRefundedSet: MoneyBagSchema
});

const OutputSchema = z.object({
    refunds: z.array(RefundSchema)
});

const ProviderMoneyV2Schema = z.object({
    amount: z.string(),
    currencyCode: z.string()
});

const ProviderMoneyBagSchema = z.object({
    shopMoney: ProviderMoneyV2Schema,
    presentmentMoney: ProviderMoneyV2Schema
});

const ProviderLineItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    title: z.string(),
    variantTitle: z.string().nullable().optional(),
    sku: z.string().nullable().optional()
});

const ProviderLocationSchema = z.object({
    id: z.string(),
    name: z.string()
});

const ProviderRefundLineItemSchema = z.object({
    id: z.string(),
    quantity: z.number(),
    restocked: z.boolean(),
    restockType: z.string(),
    lineItem: ProviderLineItemSchema,
    location: ProviderLocationSchema.nullable().optional(),
    priceSet: ProviderMoneyBagSchema,
    subtotalSet: ProviderMoneyBagSchema,
    totalTaxSet: ProviderMoneyBagSchema
});

const ProviderTransactionSchema = z.object({
    id: z.string(),
    kind: z.string(),
    status: z.string(),
    gateway: z.string().nullable().optional(),
    createdAt: z.string().nullable().optional(),
    processedAt: z.string().nullable().optional(),
    amountSet: ProviderMoneyBagSchema
});

const ProviderRefundDutySchema = z.object({
    amountSet: ProviderMoneyBagSchema,
    originalDuty: z
        .object({
            id: z.string()
        })
        .nullable()
        .optional()
});

const ProviderRefundSchema = z.object({
    id: z.string(),
    createdAt: z.string().nullable().optional(),
    note: z.string().nullable().optional(),
    refundLineItems: z.object({
        nodes: z.array(ProviderRefundLineItemSchema)
    }),
    transactions: z.object({
        nodes: z.array(ProviderTransactionSchema)
    }),
    duties: z.array(ProviderRefundDutySchema).nullable().optional(),
    totalRefundedSet: ProviderMoneyBagSchema
});

const ProviderOrderSchema = z.object({
    refunds: z.array(ProviderRefundSchema).optional()
});

const GraphQLResponseSchema = z.object({
    data: z.unknown().optional(),
    errors: z.array(z.unknown()).optional()
});

const GraphQLDataSchema = z.object({
    order: z.unknown().nullable().optional()
});

const GraphQLErrorSchema = z.object({
    message: z.string().optional()
});

const action = createAction({
    description: 'List refunds for a Shopify order.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_orders'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const orderId = input.order_id.startsWith('gid://') ? input.order_id : `gid://shopify/Order/${input.order_id}`;

        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql
            endpoint: '/admin/api/2025-01/graphql.json',
            data: {
                query: `
                    query GetOrderRefunds($id: ID!) {
                        order(id: $id) {
                            refunds(first: 100) {
                                id
                                createdAt
                                note
                                refundLineItems(first: 100) {
                                    nodes {
                                        id
                                        quantity
                                        restocked
                                        restockType
                                        lineItem {
                                            id
                                            name
                                            title
                                            variantTitle
                                            sku
                                        }
                                        location {
                                            id
                                            name
                                        }
                                        priceSet {
                                            shopMoney {
                                                amount
                                                currencyCode
                                            }
                                            presentmentMoney {
                                                amount
                                                currencyCode
                                            }
                                        }
                                        subtotalSet {
                                            shopMoney {
                                                amount
                                                currencyCode
                                            }
                                            presentmentMoney {
                                                amount
                                                currencyCode
                                            }
                                        }
                                        totalTaxSet {
                                            shopMoney {
                                                amount
                                                currencyCode
                                            }
                                            presentmentMoney {
                                                amount
                                                currencyCode
                                            }
                                        }
                                    }
                                }
                                transactions(first: 100) {
                                    nodes {
                                        id
                                        kind
                                        status
                                        gateway
                                        createdAt
                                        processedAt
                                        amountSet {
                                            shopMoney {
                                                amount
                                                currencyCode
                                            }
                                            presentmentMoney {
                                                amount
                                                currencyCode
                                            }
                                        }
                                    }
                                }
                                duties {
                                    amountSet {
                                        shopMoney {
                                            amount
                                            currencyCode
                                        }
                                        presentmentMoney {
                                            amount
                                            currencyCode
                                        }
                                    }
                                    originalDuty {
                                        id
                                    }
                                }
                                totalRefundedSet {
                                    shopMoney {
                                        amount
                                        currencyCode
                                    }
                                    presentmentMoney {
                                        amount
                                        currencyCode
                                    }
                                }
                            }
                        }
                    }
                `,
                variables: {
                    id: orderId
                }
            },
            retries: 3
        });

        const graphqlResponse = GraphQLResponseSchema.parse(response.data);

        if (graphqlResponse.errors && graphqlResponse.errors.length > 0) {
            const firstError = GraphQLErrorSchema.parse(graphqlResponse.errors[0]);
            throw new nango.ActionError({
                type: 'provider_error',
                message: firstError.message || 'GraphQL error occurred'
            });
        }

        const data = GraphQLDataSchema.parse(graphqlResponse.data);

        if (!data.order) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Order not found for ID: ${input.order_id}`
            });
        }

        const order = ProviderOrderSchema.parse(data.order);
        const refunds = order.refunds || [];

        return {
            refunds: refunds.map((refund) => ({
                id: refund.id,
                createdAt: refund.createdAt,
                note: refund.note,
                refundLineItems: refund.refundLineItems.nodes,
                transactions: refund.transactions.nodes,
                duties: refund.duties || [],
                totalRefundedSet: refund.totalRefundedSet
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
