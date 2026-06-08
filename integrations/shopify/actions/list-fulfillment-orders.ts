import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    first: z.number().int().min(1).max(250).optional().describe('Number of records to return (1-250). Default: 50.'),
    after: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    query: z.string().optional().describe('Filter query using Shopify search syntax.'),
    includeClosed: z.boolean().optional().describe('Whether to include closed fulfillment orders. Default: false.'),
    sortKey: z.enum(['ID']).optional().describe('Sort key. Default: ID.'),
    reverse: z.boolean().optional().describe('Reverse the order of the results. Default: false.')
});

const AssignedLocationSchema = z.object({
    name: z.string().optional()
});

const FulfillmentOrderSchema = z.object({
    id: z.string(),
    status: z.string(),
    requestStatus: z.string(),
    orderId: z.string(),
    orderName: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    assignedLocation: AssignedLocationSchema.optional()
});

const OutputSchema = z.object({
    items: z.array(FulfillmentOrderSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List fulfillment orders visible to the app.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-fulfillment-orders',
        group: 'Fulfillment Orders'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [
        'read_assigned_fulfillment_orders',
        'read_merchant_managed_fulfillment_orders',
        'read_third_party_fulfillment_orders',
        'read_marketplace_fulfillment_orders'
    ],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const first = input.first ?? 50;

        const graphQuery = `
            query fulfillmentOrders($first: Int, $after: String, $query: String, $includeClosed: Boolean, $sortKey: FulfillmentOrderSortKeys, $reverse: Boolean) {
                fulfillmentOrders(
                    first: $first
                    after: $after
                    query: $query
                    includeClosed: $includeClosed
                    sortKey: $sortKey
                    reverse: $reverse
                ) {
                    edges {
                        node {
                            id
                            status
                            requestStatus
                            orderId
                            orderName
                            createdAt
                            updatedAt
                            assignedLocation {
                                name
                            }
                        }
                        cursor
                    }
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                }
            }
        `;

        const variables = {
            first: first,
            ...(input.after && { after: input.after }),
            ...(input.query !== undefined && { query: input.query }),
            ...(input.includeClosed !== undefined && { includeClosed: input.includeClosed }),
            ...(input.sortKey !== undefined && { sortKey: input.sortKey }),
            ...(input.reverse !== undefined && { reverse: input.reverse })
        };

        // https://shopify.dev/docs/api/admin-graphql/2025-04/queries/fulfillmentOrders
        const response = await nango.post({
            endpoint: '/admin/api/2025-04/graphql.json',
            data: {
                query: graphQuery,
                variables: variables
            },
            retries: 3
        });

        const ErrorSchema = z.object({
            errors: z
                .array(
                    z.object({
                        message: z.string()
                    })
                )
                .optional()
        });

        const errorCheck = ErrorSchema.safeParse(response.data);
        if (errorCheck.success && errorCheck.data.errors && errorCheck.data.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: errorCheck.data.errors.map((e) => e.message).join('; ')
            });
        }

        const ResponseSchema = z.object({
            data: z
                .object({
                    fulfillmentOrders: z
                        .object({
                            edges: z.array(
                                z.object({
                                    node: z.object({
                                        id: z.string(),
                                        status: z.string(),
                                        requestStatus: z.string(),
                                        orderId: z.string(),
                                        orderName: z.string(),
                                        createdAt: z.string(),
                                        updatedAt: z.string(),
                                        assignedLocation: z
                                            .object({
                                                name: z.string().optional()
                                            })
                                            .optional()
                                            .nullable()
                                    }),
                                    cursor: z.string()
                                })
                            ),
                            pageInfo: z.object({
                                hasNextPage: z.boolean(),
                                endCursor: z.string().optional().nullable()
                            })
                        })
                        .optional()
                        .nullable()
                })
                .optional()
                .nullable()
        });

        const parsed = ResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Shopify API'
            });
        }

        const fulfillmentOrdersData = parsed.data.data?.fulfillmentOrders;
        if (!fulfillmentOrdersData) {
            return {
                items: []
            };
        }

        const items = fulfillmentOrdersData.edges.map((edge) => {
            const node = edge.node;
            return {
                id: node.id,
                status: node.status,
                requestStatus: node.requestStatus,
                orderId: node.orderId,
                orderName: node.orderName,
                createdAt: node.createdAt,
                updatedAt: node.updatedAt,
                ...(node.assignedLocation !== undefined &&
                    node.assignedLocation !== null && {
                        assignedLocation: {
                            ...(node.assignedLocation.name !== undefined && { name: node.assignedLocation.name })
                        }
                    })
            };
        });

        const nextCursor = fulfillmentOrdersData.pageInfo.hasNextPage ? (fulfillmentOrdersData.pageInfo.endCursor ?? undefined) : undefined;

        return {
            items: items,
            ...(nextCursor !== undefined && { nextCursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
