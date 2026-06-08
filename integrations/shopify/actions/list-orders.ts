import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    first: z.number().int().min(1).max(250).optional().describe('Number of orders to return. Max 250.'),
    after: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    sortKey: z
        .enum([
            'CREATED_AT',
            'CUSTOMER_NAME',
            'DESTINATION',
            'FINANCIAL_STATUS',
            'FULFILLMENT_STATUS',
            'ID',
            'ORDER_NUMBER',
            'PROCESSED_AT',
            'RELEVANCE',
            'TOTAL_PRICE',
            'UPDATED_AT'
        ])
        .optional()
        .describe('Sort key for ordering results.'),
    reverse: z.boolean().optional().describe('Reverse the order of the results.'),
    query: z.string().optional().describe('Filter query string. Example: "status:open"')
});

const GraphQLErrorSchema = z.object({
    message: z.string(),
    extensions: z.unknown().optional()
});

const OrderNodeSchema = z.object({
    id: z.string(),
    name: z.string(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    displayFinancialStatus: z.string().optional(),
    displayFulfillmentStatus: z.string().optional(),
    totalPriceSet: z
        .object({
            shopMoney: z.object({
                amount: z.string(),
                currencyCode: z.string()
            })
        })
        .optional()
});

const OrderEdgeSchema = z.object({
    node: OrderNodeSchema,
    cursor: z.string()
});

const PageInfoSchema = z.object({
    hasNextPage: z.boolean(),
    endCursor: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            orders: z
                .object({
                    edges: z.array(OrderEdgeSchema),
                    pageInfo: PageInfoSchema
                })
                .optional()
                .nullable()
        })
        .optional()
        .nullable(),
    errors: z.array(GraphQLErrorSchema).optional()
});

const OutputSchema = z.object({
    items: z.array(
        z.object({
            id: z.string(),
            name: z.string(),
            createdAt: z.string().optional(),
            updatedAt: z.string().optional(),
            displayFinancialStatus: z.string().optional(),
            displayFulfillmentStatus: z.string().optional(),
            totalPriceSet: z
                .object({
                    shopMoney: z.object({
                        amount: z.string(),
                        currencyCode: z.string()
                    })
                })
                .optional()
        })
    ),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List Shopify orders with cursor pagination and query filters.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-orders',
        group: 'Orders'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_orders'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/2025-04/queries/orders
            endpoint: '/admin/api/2025-04/graphql.json',
            data: {
                query: `query Orders($first: Int, $after: String, $sortKey: OrderSortKeys, $reverse: Boolean, $query: String) {
                    orders(first: $first, after: $after, sortKey: $sortKey, reverse: $reverse, query: $query) {
                        edges {
                            node {
                                id
                                name
                                createdAt
                                updatedAt
                                displayFinancialStatus
                                displayFulfillmentStatus
                                totalPriceSet {
                                    shopMoney {
                                        amount
                                        currencyCode
                                    }
                                }
                            }
                            cursor
                        }
                        pageInfo {
                            hasNextPage
                            endCursor
                        }
                    }
                }`,
                variables: {
                    ...(input.first !== undefined && { first: input.first }),
                    ...(input.after !== undefined && { after: input.after }),
                    ...(input.sortKey !== undefined && { sortKey: input.sortKey }),
                    ...(input.reverse !== undefined && { reverse: input.reverse }),
                    ...(input.query !== undefined && { query: input.query })
                }
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Empty response from Shopify'
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.errors && providerResponse.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: providerResponse.errors.map((error) => error.message).join('; ')
            });
        }

        const orders = providerResponse.data?.orders;
        if (!orders) {
            return {
                items: []
            };
        }

        return {
            items: orders.edges.map((edge) => ({
                id: edge.node.id,
                name: edge.node.name,
                ...(edge.node.createdAt != null && { createdAt: edge.node.createdAt }),
                ...(edge.node.updatedAt != null && { updatedAt: edge.node.updatedAt }),
                ...(edge.node.displayFinancialStatus != null && { displayFinancialStatus: edge.node.displayFinancialStatus }),
                ...(edge.node.displayFulfillmentStatus != null && { displayFulfillmentStatus: edge.node.displayFulfillmentStatus }),
                ...(edge.node.totalPriceSet != null && { totalPriceSet: edge.node.totalPriceSet })
            })),
            ...(orders.pageInfo.hasNextPage && orders.pageInfo.endCursor ? { nextCursor: orders.pageInfo.endCursor } : {})
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
