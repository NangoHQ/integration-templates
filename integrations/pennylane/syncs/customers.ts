import type { NangoSync, PennylaneCustomer, PennylaneIndividualCustomer, ProxyConfiguration } from '../../models.js';
import { toCustomer } from '../mappers/to-customer.js';

export default async function fetchData(nango: NangoSync) {
    const config: ProxyConfiguration = {
        // https://pennylane.readme.io/reference/customers-get-1
        endpoint: `/api/external/v1/customers`,
        retries: 10,
        paginate: {
            type: 'offset',
            offset_name_in_request: 'page',
            response_path: 'customers'
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

    for await (const response of nango.paginate<PennylaneIndividualCustomer>(config)) {
        const customers = response.map(toCustomer);
        await nango.batchSave<PennylaneCustomer>(customers, 'PennylaneCustomer');
    }
}
