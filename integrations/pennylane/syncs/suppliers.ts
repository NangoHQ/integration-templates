import type { NangoSync, PennylaneSupplier, ProxyConfiguration } from '../../models.js';
import { toSupplier } from '../mappers/to-supplier.js';

export default async function fetchData(nango: NangoSync) {
    const config: ProxyConfiguration = {
        // https://pennylane.readme.io/reference/suppliers-get
        endpoint: `/api/external/v1/suppliers`,
        retries: 10,
        paginate: {
            type: 'offset',
            offset_name_in_request: 'page',
            response_path: 'suppliers'
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

    for await (const response of nango.paginate<PennylaneSupplier>(config)) {
        const suppliers = response.map(toSupplier);
        await nango.batchSave<PennylaneSupplier>(suppliers, 'PennylaneSupplier');
    }
}
