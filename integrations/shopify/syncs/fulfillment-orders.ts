import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const FulfillmentOrderSchema = z.object({
    id: z.string(),
    status: z.string().optional(),
    requestStatus: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    orderId: z.string().optional(),
    orderName: z.string().optional(),
    assignedLocationId: z.string().optional(),
    assignedLocationName: z.string().optional(),
    destinationAddress1: z.string().optional(),
    destinationAddress2: z.string().optional(),
    destinationCity: z.string().optional(),
    destinationCompany: z.string().optional(),
    destinationCountryCode: z.string().optional(),
    destinationFirstName: z.string().optional(),
    destinationLastName: z.string().optional(),
    destinationPhone: z.string().optional(),
    destinationProvince: z.string().optional(),
    destinationZip: z.string().optional()
});

const ProviderFulfillmentOrderNodeSchema = z.object({
    id: z.string(),
    status: z.string(),
    requestStatus: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    orderId: z.string(),
    orderName: z.string(),
    assignedLocation: z.object({
        location: z
            .object({
                id: z.string().nullable(),
                name: z.string().nullable()
            })
            .nullable()
    }),
    destination: z
        .object({
            address1: z.string().nullable(),
            address2: z.string().nullable(),
            city: z.string().nullable(),
            company: z.string().nullable(),
            countryCode: z.string().nullable(),
            firstName: z.string().nullable(),
            lastName: z.string().nullable(),
            phone: z.string().nullable(),
            province: z.string().nullable(),
            zip: z.string().nullable()
        })
        .nullable()
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    cursor: z.string()
});

const sync = createSync({
    description: 'Sync Shopify fulfillment orders for operational workflows.',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    // https://shopify.dev/docs/api/admin-graphql/2026-04/queries/fulfillmentOrders
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/fulfillment-orders'
        }
    ],
    checkpoint: CheckpointSchema,
    models: {
        FulfillmentOrder: FulfillmentOrderSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const updatedAfter = checkpoint?.['updated_after'] ? checkpoint['updated_after'] : undefined;
        let pageToken = checkpoint?.['cursor'] ? checkpoint['cursor'] : undefined;

        // https://shopify.dev/docs/api/admin-graphql/2026-04/queries/fulfillmentOrders
        const proxyConfig: ProxyConfiguration = {
            // https://shopify.dev/docs/api/admin-graphql/2026-04/queries/fulfillmentOrders
            endpoint: '/admin/api/2026-04/graphql.json',
            method: 'POST',
            data: {
                query: `
                    query GetFulfillmentOrders($first: Int!, $after: String, $query: String) {
                        fulfillmentOrders(first: $first, after: $after, query: $query, sortKey: UPDATED_AT, reverse: false) {
                            edges {
                                cursor
                                node {
                                    id
                                    status
                                    requestStatus
                                    createdAt
                                    updatedAt
                                    orderId
                                    orderName
                                    assignedLocation {
                                        location {
                                            id
                                            name
                                        }
                                    }
                                    destination {
                                        address1
                                        address2
                                        city
                                        company
                                        countryCode
                                        firstName
                                        lastName
                                        phone
                                        province
                                        zip
                                    }
                                }
                            }
                            pageInfo {
                                hasNextPage
                                endCursor
                            }
                        }
                    }
                `,
                variables: {
                    first: 100,
                    after: pageToken ?? null,
                    query: updatedAfter ? `updated_at:>'${updatedAfter}'` : null
                }
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'variables.after',
                cursor_path_in_response: 'data.fulfillmentOrders.pageInfo.endCursor',
                response_path: 'data.fulfillmentOrders.edges',
                limit_name_in_request: 'variables.first',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    pageToken = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const edges of nango.paginate(proxyConfig)) {
            const orders = edges.map((edge: { cursor: string; node: unknown }) => {
                const parsedNode = ProviderFulfillmentOrderNodeSchema.safeParse(edge.node);
                if (!parsedNode.success) {
                    throw new Error(`Invalid fulfillment order node: ${parsedNode.error.message}`);
                }

                const node = parsedNode.data;
                return {
                    id: node.id,
                    status: node.status,
                    requestStatus: node.requestStatus,
                    createdAt: node.createdAt,
                    updatedAt: node.updatedAt,
                    orderId: node.orderId,
                    orderName: node.orderName,
                    ...(node.assignedLocation.location?.id != null && {
                        assignedLocationId: node.assignedLocation.location.id
                    }),
                    ...(node.assignedLocation.location?.name != null && {
                        assignedLocationName: node.assignedLocation.location.name
                    }),
                    ...(node.destination?.address1 != null && {
                        destinationAddress1: node.destination.address1
                    }),
                    ...(node.destination?.address2 != null && {
                        destinationAddress2: node.destination.address2
                    }),
                    ...(node.destination?.city != null && {
                        destinationCity: node.destination.city
                    }),
                    ...(node.destination?.company != null && {
                        destinationCompany: node.destination.company
                    }),
                    ...(node.destination?.countryCode != null && {
                        destinationCountryCode: node.destination.countryCode
                    }),
                    ...(node.destination?.firstName != null && {
                        destinationFirstName: node.destination.firstName
                    }),
                    ...(node.destination?.lastName != null && {
                        destinationLastName: node.destination.lastName
                    }),
                    ...(node.destination?.phone != null && {
                        destinationPhone: node.destination.phone
                    }),
                    ...(node.destination?.province != null && {
                        destinationProvince: node.destination.province
                    }),
                    ...(node.destination?.zip != null && {
                        destinationZip: node.destination.zip
                    })
                };
            });

            if (orders.length === 0) {
                continue;
            }

            await nango.batchSave(orders, 'FulfillmentOrder');

            const lastRecord = orders[orders.length - 1];
            if (lastRecord === undefined) {
                continue;
            }
            const lastUpdatedAt = lastRecord.updatedAt;
            if (pageToken) {
                await nango.saveCheckpoint({
                    updated_after: updatedAfter || '',
                    cursor: pageToken
                });
            } else if (lastUpdatedAt) {
                await nango.saveCheckpoint({
                    updated_after: lastUpdatedAt,
                    cursor: ''
                });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
