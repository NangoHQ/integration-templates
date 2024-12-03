import type { NangoSync, PennylaneProduct, ProxyConfiguration } from '../../models.js';
import { toProduct } from '../mappers/to-product.js';

export default async function fetchData(nango: NangoSync) {
    const config: ProxyConfiguration = {
        // https://pennylane.readme.io/reference/customers-get-1
        endpoint: `/api/external/v1/products`,
        retries: 10,
        paginate: {
            type: 'offset',
            offset_name_in_request: 'page',
            response_path: 'products'
        }
    };

    if (nango.lastSyncDate) {
        config.params = {
            filter: JSON.stringify([
                {
                    field: 'updated_at',
                    operator: 'gteq',
                    value: nango.lastSyncDate.toISOString()
                }
            ])
        };
    }

    for await (const response of nango.paginate<PennylaneProduct>(config)) {
        const products = response.map(toProduct);
        await nango.batchSave<PennylaneProduct>(products, 'PennylaneProduct');
    }
}
