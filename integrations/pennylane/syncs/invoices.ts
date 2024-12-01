import type { NangoSync, PennylaneInvoice, ProxyConfiguration } from '../../models.js';
import { toInvoice } from '../helpers.js';

export default async function fetchData(nango: NangoSync) {
    const config: ProxyConfiguration = {
        // https://pennylane.readme.io/reference/customer_invoices-post-1
        endpoint: '/api/external/v1/customer_invoices',
        retries: 10,
        paginate: {
            type: 'offset',
            offset_name_in_request: 'page',
            response_path: 'invoices'
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

    for await (const response of nango.paginate<PennylaneInvoice>(config)) {
        const invoices = response.map(toInvoice);
        await nango.batchSave<PennylaneInvoice>(invoices, 'PennylaneInvoice');
    }
}
