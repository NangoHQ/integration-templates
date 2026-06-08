import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ReturnSchema = z.object({
    id: z.string(),
    status: z.string(),
    orderId: z.string(),
    createdAt: z.string(),
    returnLineItems: z
        .array(
            z.object({
                id: z.string(),
                quantity: z.number().optional()
            })
        )
        .optional(),
    refunds: z
        .array(
            z.object({
                id: z.string(),
                totalRefunded: z.string().optional(),
                currencyCode: z.string().optional()
            })
        )
        .optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    cursor: z.string()
});

const sync = createSync({
    description: 'Sync Shopify returns for post-purchase and reverse logistics workflows.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Return: ReturnSchema
    },
    endpoints: [
        {
            path: '/syncs/returns',
            method: 'POST'
        }
    ],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        const updatedAfter = checkpoint?.updated_after || '';
        let afterCursor = checkpoint?.cursor || '';

        const OrderNodeSchema = z.object({
            id: z.string(),
            updatedAt: z.string(),
            returns: z.object({
                nodes: z.array(
                    z.object({
                        id: z.string(),
                        status: z.string(),
                        createdAt: z.string(),
                        order: z.object({
                            id: z.string()
                        }),
                        returnLineItems: z.object({
                            nodes: z.array(
                                z.object({
                                    id: z.string(),
                                    quantity: z.number().optional()
                                })
                            )
                        }),
                        refunds: z.object({
                            nodes: z.array(
                                z.object({
                                    id: z.string(),
                                    totalRefundedSet: z
                                        .object({
                                            shopMoney: z
                                                .object({
                                                    amount: z.string(),
                                                    currencyCode: z.string()
                                                })
                                                .optional()
                                        })
                                        .optional()
                                })
                            )
                        })
                    })
                )
            })
        });

        const proxyConfig: ProxyConfiguration = {
            // https://shopify.dev/docs/api/admin-graphql/2026-04/queries/orders
            endpoint: '/admin/api/2026-04/graphql.json',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            data: {
                query: `query GetOrdersWithReturns($first: Int!, $after: String, $query: String) {
                    orders(first: $first, after: $after, query: $query) {
                        nodes {
                            id
                            updatedAt
                            returns(first: 50) {
                                nodes {
                                    id
                                    status
                                    createdAt
                                    order { id }
                                    returnLineItems(first: 50) {
                                        nodes {
                                            ... on ReturnLineItem {
                                                id
                                                quantity
                                            }
                                        }
                                    }
                                    refunds(first: 50) {
                                        nodes {
                                            id
                                            totalRefundedSet {
                                                shopMoney {
                                                    amount
                                                    currencyCode
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        pageInfo {
                            hasNextPage
                            endCursor
                        }
                    }
                }`,
                variables: {
                    first: 5,
                    ...(afterCursor && { after: afterCursor }),
                    query: updatedAfter ? `updated_at:>${updatedAfter}` : ''
                }
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'variables.after',
                cursor_path_in_response: 'data.orders.pageInfo.endCursor',
                response_path: 'data.orders.nodes',
                limit_name_in_request: 'variables.first',
                limit: 5,
                on_page: async (paginationState: { nextPageParam?: string | number | undefined }) => {
                    afterCursor = typeof paginationState.nextPageParam === 'string' ? paginationState.nextPageParam : '';
                }
            },
            retries: 3
        };

        for await (const orderBatch of nango.paginate(proxyConfig)) {
            const orders = z.array(OrderNodeSchema).parse(orderBatch);

            if (orders.length === 0) {
                continue;
            }

            const returns = [];
            for (const order of orders) {
                for (const returnNode of order.returns.nodes) {
                    returns.push({
                        id: returnNode.id,
                        status: returnNode.status,
                        orderId: returnNode.order.id,
                        createdAt: returnNode.createdAt,
                        returnLineItems: returnNode.returnLineItems.nodes.map((item) => ({
                            id: item.id,
                            ...(item.quantity !== undefined ? { quantity: item.quantity } : {})
                        })),
                        refunds: returnNode.refunds.nodes.map((refund) => ({
                            id: refund.id,
                            ...(refund.totalRefundedSet?.shopMoney
                                ? {
                                      totalRefunded: refund.totalRefundedSet.shopMoney.amount,
                                      currencyCode: refund.totalRefundedSet.shopMoney.currencyCode
                                  }
                                : {})
                        }))
                    });
                }
            }

            if (returns.length > 0) {
                await nango.batchSave(returns, 'Return');
            }

            if (afterCursor) {
                await nango.saveCheckpoint({
                    updated_after: updatedAfter,
                    cursor: afterCursor
                });
                continue;
            }

            const lastOrder = orders[orders.length - 1];
            if (lastOrder) {
                await nango.saveCheckpoint({
                    updated_after: lastOrder.updatedAt,
                    cursor: ''
                });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
