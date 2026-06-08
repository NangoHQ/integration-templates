import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MoneySchema = z.object({
    amount: z.string(),
    currencyCode: z.string()
});

const CustomerSchema = z.object({
    firstName: z.string().nullish(),
    lastName: z.string().nullish(),
    displayName: z.string().nullish(),
    email: z.string().nullish(),
    phone: z.string().nullish()
});

const AddressSchema = z.object({
    address1: z.string().nullish(),
    address2: z.string().nullish(),
    city: z.string().nullish(),
    country: z.string().nullish(),
    province: z.string().nullish(),
    zip: z.string().nullish()
});

const LineItemSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    quantity: z.number().optional(),
    originalTotalSet: MoneySchema.optional(),
    discountedTotalSet: MoneySchema.optional()
});

const OrderSchema = z.object({
    id: z.string(),
    name: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    processedAt: z.string().nullish(),
    currencyCode: z.string().nullish(),
    presentmentCurrencyCode: z.string().nullish(),
    confirmed: z.boolean().optional(),
    cancelledAt: z.string().nullish(),
    cancelReason: z.string().nullish(),
    closed: z.boolean().optional(),
    closedAt: z.string().nullish(),
    fullyPaid: z.boolean().optional(),
    customer: CustomerSchema.nullish(),
    totalReceivedSet: MoneySchema.optional(),
    subtotalPriceSet: MoneySchema.optional(),
    totalTaxSet: MoneySchema.optional(),
    shippingAddress: AddressSchema.nullish(),
    billingAddress: AddressSchema.nullish(),
    lineItems: z.array(LineItemSchema).optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    cursor: z.string()
});

const MoneyBagSchema = z.object({
    presentmentMoney: z.object({
        amount: z.string(),
        currencyCode: z.string()
    })
});

const OrderEdgeSchema = z.object({
    node: z.object({
        id: z.string(),
        name: z.string(),
        createdAt: z.string(),
        updatedAt: z.string(),
        processedAt: z.string().nullish(),
        currencyCode: z.string().nullish(),
        presentmentCurrencyCode: z.string().nullish(),
        confirmed: z.boolean().nullish(),
        cancelledAt: z.string().nullish(),
        cancelReason: z.string().nullish(),
        closed: z.boolean().nullish(),
        closedAt: z.string().nullish(),
        fullyPaid: z.boolean().nullish(),
        customer: z
            .object({
                firstName: z.string().nullish(),
                lastName: z.string().nullish(),
                displayName: z.string().nullish(),
                email: z.string().nullish(),
                phone: z.string().nullish()
            })
            .nullish(),
        totalReceivedSet: MoneyBagSchema.nullish(),
        subtotalPriceSet: MoneyBagSchema.nullish(),
        totalTaxSet: MoneyBagSchema.nullish(),
        shippingAddress: z
            .object({
                address1: z.string().nullish(),
                address2: z.string().nullish(),
                city: z.string().nullish(),
                country: z.string().nullish(),
                province: z.string().nullish(),
                zip: z.string().nullish()
            })
            .nullish(),
        billingAddress: z
            .object({
                address1: z.string().nullish(),
                address2: z.string().nullish(),
                city: z.string().nullish(),
                country: z.string().nullish(),
                province: z.string().nullish(),
                zip: z.string().nullish()
            })
            .nullish(),
        lineItems: z
            .object({
                edges: z
                    .array(
                        z.object({
                            node: z.object({
                                id: z.string(),
                                name: z.string().nullish(),
                                quantity: z.number().nullish(),
                                originalTotalSet: MoneyBagSchema.nullish(),
                                discountedTotalSet: MoneyBagSchema.nullish()
                            })
                        })
                    )
                    .nullish()
            })
            .nullish()
    }),
    cursor: z.string()
});

const sync = createSync({
    description: 'Fetches a list of orders from Shopify.',
    version: '2.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    scopes: ['read_customers', 'read_orders'],
    models: {
        Order: OrderSchema
    },
    endpoints: [
        {
            path: '/syncs/orders',
            method: 'POST'
        }
    ],

    exec: async (nango) => {
        const checkpoint = CheckpointSchema.parse((await nango.getCheckpoint()) ?? { updated_after: '', cursor: '' });
        const updatedAfter = checkpoint.updated_after || undefined;
        let cursor = checkpoint.cursor || undefined;
        const queryFilter = updatedAfter ? `updated_at:>${updatedAfter}` : '';

        const proxyConfig: ProxyConfiguration = {
            // https://shopify.dev/docs/api/admin-graphql/2024-01/queries/orders
            endpoint: '/admin/api/2024-01/graphql.json',
            method: 'POST',
            data: {
                query: `
                    query GetOrders($first: Int!, $after: String, $query: String) {
                        orders(first: $first, after: $after, query: $query, sortKey: UPDATED_AT) {
                            edges {
                                node {
                                    id
                                    name
                                    createdAt
                                    updatedAt
                                    processedAt
                                    currencyCode
                                    presentmentCurrencyCode
                                    confirmed
                                    cancelledAt
                                    cancelReason
                                    closed
                                    closedAt
                                    fullyPaid
                                    customer {
                                        firstName
                                        lastName
                                        displayName
                                        email
                                        phone
                                    }
                                    totalReceivedSet {
                                        presentmentMoney {
                                            amount
                                            currencyCode
                                        }
                                    }
                                    subtotalPriceSet {
                                        presentmentMoney {
                                            amount
                                            currencyCode
                                        }
                                    }
                                    totalTaxSet {
                                        presentmentMoney {
                                            amount
                                            currencyCode
                                        }
                                    }
                                    shippingAddress {
                                        address1
                                        address2
                                        city
                                        country
                                        province
                                        zip
                                    }
                                    billingAddress {
                                        address1
                                        address2
                                        city
                                        country
                                        province
                                        zip
                                    }
                                    lineItems(first: 250) {
                                        edges {
                                            node {
                                                id
                                                name
                                                quantity
                                                originalTotalSet {
                                                    presentmentMoney {
                                                        amount
                                                        currencyCode
                                                    }
                                                }
                                                discountedTotalSet {
                                                    presentmentMoney {
                                                        amount
                                                        currencyCode
                                                    }
                                                }
                                            }
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
                    }
                `,
                variables: {
                    first: 50,
                    ...(cursor && { after: cursor }),
                    query: queryFilter
                }
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'variables.after',
                cursor_path_in_response: 'data.orders.pageInfo.endCursor',
                response_path: 'data.orders.edges',
                limit_name_in_request: 'variables.first',
                limit: 50,
                on_page: async ({ nextPageParam }) => {
                    cursor = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        let maxUpdatedAt: string | undefined;

        for await (const page of nango.paginate(proxyConfig)) {
            const edges = z.array(z.unknown()).parse(page);
            const orders = [];

            for (const edge of edges) {
                const parsedEdge = OrderEdgeSchema.safeParse(edge);
                if (!parsedEdge.success) {
                    throw new Error('Invalid order edge from Shopify GraphQL');
                }

                const node = parsedEdge.data.node;
                const lineItems =
                    node.lineItems?.edges?.map((e) => {
                        const item = e.node;
                        return {
                            id: item.id,
                            ...(item.name != null && { name: item.name }),
                            ...(item.quantity != null && { quantity: item.quantity }),
                            ...(item.originalTotalSet?.presentmentMoney != null && {
                                originalTotalSet: {
                                    amount: item.originalTotalSet.presentmentMoney.amount,
                                    currencyCode: item.originalTotalSet.presentmentMoney.currencyCode
                                }
                            }),
                            ...(item.discountedTotalSet?.presentmentMoney != null && {
                                discountedTotalSet: {
                                    amount: item.discountedTotalSet.presentmentMoney.amount,
                                    currencyCode: item.discountedTotalSet.presentmentMoney.currencyCode
                                }
                            })
                        };
                    }) ?? [];

                orders.push({
                    id: node.id,
                    name: node.name,
                    createdAt: node.createdAt,
                    updatedAt: node.updatedAt,
                    ...(node.processedAt != null && { processedAt: node.processedAt }),
                    ...(node.currencyCode != null && { currencyCode: node.currencyCode }),
                    ...(node.presentmentCurrencyCode != null && { presentmentCurrencyCode: node.presentmentCurrencyCode }),
                    ...(node.confirmed != null && { confirmed: node.confirmed }),
                    ...(node.cancelledAt != null && { cancelledAt: node.cancelledAt }),
                    ...(node.cancelReason != null && { cancelReason: node.cancelReason }),
                    ...(node.closed != null && { closed: node.closed }),
                    ...(node.closedAt != null && { closedAt: node.closedAt }),
                    ...(node.fullyPaid != null && { fullyPaid: node.fullyPaid }),
                    ...(node.customer != null && {
                        customer: {
                            ...(node.customer.firstName != null && { firstName: node.customer.firstName }),
                            ...(node.customer.lastName != null && { lastName: node.customer.lastName }),
                            ...(node.customer.displayName != null && { displayName: node.customer.displayName }),
                            ...(node.customer.email != null && { email: node.customer.email }),
                            ...(node.customer.phone != null && { phone: node.customer.phone })
                        }
                    }),
                    ...(node.totalReceivedSet?.presentmentMoney != null && {
                        totalReceivedSet: {
                            amount: node.totalReceivedSet.presentmentMoney.amount,
                            currencyCode: node.totalReceivedSet.presentmentMoney.currencyCode
                        }
                    }),
                    ...(node.subtotalPriceSet?.presentmentMoney != null && {
                        subtotalPriceSet: {
                            amount: node.subtotalPriceSet.presentmentMoney.amount,
                            currencyCode: node.subtotalPriceSet.presentmentMoney.currencyCode
                        }
                    }),
                    ...(node.totalTaxSet?.presentmentMoney != null && {
                        totalTaxSet: {
                            amount: node.totalTaxSet.presentmentMoney.amount,
                            currencyCode: node.totalTaxSet.presentmentMoney.currencyCode
                        }
                    }),
                    ...(node.shippingAddress != null && {
                        shippingAddress: {
                            ...(node.shippingAddress.address1 != null && { address1: node.shippingAddress.address1 }),
                            ...(node.shippingAddress.address2 != null && { address2: node.shippingAddress.address2 }),
                            ...(node.shippingAddress.city != null && { city: node.shippingAddress.city }),
                            ...(node.shippingAddress.country != null && { country: node.shippingAddress.country }),
                            ...(node.shippingAddress.province != null && { province: node.shippingAddress.province }),
                            ...(node.shippingAddress.zip != null && { zip: node.shippingAddress.zip })
                        }
                    }),
                    ...(node.billingAddress != null && {
                        billingAddress: {
                            ...(node.billingAddress.address1 != null && { address1: node.billingAddress.address1 }),
                            ...(node.billingAddress.address2 != null && { address2: node.billingAddress.address2 }),
                            ...(node.billingAddress.city != null && { city: node.billingAddress.city }),
                            ...(node.billingAddress.country != null && { country: node.billingAddress.country }),
                            ...(node.billingAddress.province != null && { province: node.billingAddress.province }),
                            ...(node.billingAddress.zip != null && { zip: node.billingAddress.zip })
                        }
                    }),
                    ...(lineItems.length > 0 && { lineItems })
                });

                if (node.updatedAt && (maxUpdatedAt === undefined || node.updatedAt > maxUpdatedAt)) {
                    maxUpdatedAt = node.updatedAt;
                }
            }

            if (orders.length > 0) {
                await nango.batchSave(orders, 'Order');
            }

            if (cursor !== undefined) {
                await nango.saveCheckpoint({
                    updated_after: updatedAfter || '',
                    cursor
                });
            }
        }

        if (maxUpdatedAt) {
            await nango.saveCheckpoint({ updated_after: maxUpdatedAt, cursor: '' });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
