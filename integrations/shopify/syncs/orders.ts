import type { NangoSync } from '../../models.js';
import { paginate } from '../helpers/paginate.js';
import { toOrder } from '../mappers/to-order.js';

export default async function fetchData(nango: NangoSync): Promise<void> {
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

    for await (const batch of paginate(nango, tableName, topLevelFields, paginatedFields)) {
        // https://shopify.dev/docs/api/admin-graphql/2025-01/queries/orders
        const mappedOrders = batch.map(toOrder);
        await nango.batchSave(mappedOrders, 'Order');
    }
}
