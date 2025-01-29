import type { NangoSync, ProxyConfiguration } from '../../models';
import type { CDCConfig } from '../types';
import { getCompany } from '../utils/get-company.js';

export async function* cdcPaginate<T>(nango: NangoSync, config: CDCConfig): AsyncGenerator<T[], void, undefined> {
    const BATCH_SIZE = 1000; // Max Quickbooks Server responses can handle
    const startSyncPoint = config.lastSyncDate;

    const realmId = await getCompany(nango); // Get company connection details

    const proxyConfig: ProxyConfiguration = {
        // https://developer.intuit.com/app/developer/qbo/docs/learn/explore-the-quickbooks-online-api/change-data-capture
        endpoint: `/v3/company/${realmId}/cdc`,
        params: {
            entities: config.entity,
            changedSince: startSyncPoint.toISOString()
        },
        headers: {
            'Content-Type': 'text/plain'
        },
        paginate: {
            type: 'offset',
            offset_name_in_request: 'startPosition',
            response_path: `CDCResponse[0].QueryResponse[0].${config.entity}`,
            limit_name_in_request: 'maxResults',
            limit: BATCH_SIZE
        },
        retries: 3
    };

    await nango.log('Starting CDC sync for entity:', {
        entity: config.entity,
        changedSince: startSyncPoint.toISOString()
    });

    for await (const records of nango.paginate<T>(proxyConfig)) {
        if (records.length > 0) {
            yield records;
        }
    }
}
