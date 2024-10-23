import type { Product, NangoSync, ProxyConfiguration } from '../../models';
import type { HubSpotProduct } from '../types';

export default async function fetchData(nango: NangoSync) {
    const properties = [
        'amount',
        'description',
        'discount',
        'hs_sku',
        'hs_url',
        'name',
        'price',
        'quantity',
        'recurringbillingfrequency',
        'tax'
    ];

    const config: ProxyConfiguration = {
        endpoint: '/crm/v3/objects/products',
        params: {
            properties: properties.join(','),
            limit: 1,
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
}
