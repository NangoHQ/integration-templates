import { createSync } from 'nango';
import type { HubSpotProduct } from '../types.js';

import type { ProxyConfiguration } from 'nango';
import { Product } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Fetches a list of products from Hubspot',
    version: '2.0.0',
    frequency: 'every day',
    autoStart: true,
    syncType: 'full',

    endpoints: [
        {
            method: 'GET',
            path: '/products',
            group: 'Products'
        }
    ],

    scopes: ['e-commerce'],

    models: {
        Product: Product
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const properties = ['amount', 'description', 'discount', 'hs_sku', 'hs_url', 'name', 'price', 'quantity', 'recurringbillingfrequency', 'tax'];

        const config: ProxyConfiguration = {
            // https://developers.hubspot.com/docs/api/crm/products
            endpoint: '/crm/v3/objects/products',
            params: {
                properties: properties.join(',')
            },
            retries: 10
        };

        for await (const hProducts of nango.paginate<HubSpotProduct>(config)) {
            const products: Product[] = hProducts.map((hproduct: HubSpotProduct) => {
                const product: Product = {
                    id: hproduct.id,
                    amount: hproduct.properties.amount,
                    description: hproduct.properties.description,
                    discount: hproduct.properties.discount,
                    sku: hproduct.properties.hs_sku,
                    url: hproduct.properties.hs_url,
                    name: hproduct.properties.name,
                    price: hproduct.properties.price,
                    quantity: hproduct.properties.quantity,
                    recurringBillingFrequency: hproduct.properties.recurringbillingfrequency,
                    tax: hproduct.properties.tax,
                    createdAt: hproduct.createdAt,
                    updatedAt: hproduct.updatedAt
                };

                return product;
            });

            await nango.batchSave(products, 'Product');
        }
    await nango.deleteRecordsFromPreviousExecutions("Product");
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
