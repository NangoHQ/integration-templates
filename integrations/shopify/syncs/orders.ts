import { createSync } from 'nango';
import { paginate } from '../helpers/paginate.js';
import { toOrder } from '../mappers/to-order.js';

import { Order } from '../models.js';
import { z } from 'zod';

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const sync = createSync({
    description: 'Fetches a list of orders from Shopify.',
    version: '1.1.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,

    endpoints: [
        {
            method: 'GET',
            path: '/orders',
            group: 'Orders'
        }
    ],

    scopes: ['read_customers', 'read_orders'],

    models: {
        Order: Order
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : undefined;
        const checkpointUpdatedAfter = checkpoint?.updated_after ? new Date(checkpoint.updated_after) : undefined;
        const tableName = 'orders';
        const topLevelFields = [
            'id',
            'name',
            'createdAt',
            'updatedAt',
            'processedAt',
            'currencyCode',
            'presentmentCurrencyCode',
            'confirmed',
            'cancelledAt',
            'cancelReason',
            'closed',
            'closedAt',
            'fullyPaid',
            `customer {
                    firstName
                    lastName
                    displayName
                    email
                    phone
                }`,
            `totalReceivedSet {
                    presentmentMoney {
                        amount
                        currencyCode
                    }
                }`,
            `subtotalPriceSet {
                    presentmentMoney {
                        amount
                        currencyCode
                    }
                }`,
            `totalTaxSet {
                    presentmentMoney {
                        amount
                        currencyCode
                    }
                }`,
            `shippingAddress {
                    address1
                    address2
                    city
                    country
                    province
                    zip
                }`,
            `billingAddress {
                    address1
                    address2
                    city
                    country
                    province
                    zip
                }`
        ];

        const paginatedFields = [
            {
                field: 'lineItems',
                fields: [
                    'id',
                    'name',
                    'quantity',
                    `originalTotalSet {
                            presentmentMoney {
                                amount
                                currencyCode
                            }
                        }`,
                    `discountedTotalSet {
                            presentmentMoney {
                                amount
                                currencyCode
                            }
                        }`
                ]
            }
        ];

        let latestUpdatedAt = checkpoint?.updated_after;

        for await (const batch of paginate(nango, tableName, topLevelFields, paginatedFields, checkpointUpdatedAfter)) {
            // https://shopify.dev/docs/api/admin-graphql/2025-01/queries/orders
            const mappedOrders = batch.map(toOrder);
            if (mappedOrders.length > 0) {
                await nango.batchSave(mappedOrders, 'Order');
                const batchLatest = getLatestUpdatedAt(batch, latestUpdatedAt);
                if (batchLatest) {
                    latestUpdatedAt = batchLatest;
                    await nango.saveCheckpoint({ updated_after: latestUpdatedAt });
                }
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

function getLatestUpdatedAt(orders: Array<{ updatedAt?: string }>, current?: string): string | undefined {
    return orders.reduce((latest, order) => {
        if (!order.updatedAt) {
            return latest;
        }
        if (!latest || new Date(order.updatedAt).getTime() > new Date(latest).getTime()) {
            return order.updatedAt;
        }
        return latest;
    }, current);
}
