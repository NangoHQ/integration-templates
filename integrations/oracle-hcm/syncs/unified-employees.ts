import type { NangoSync, ProxyConfiguration } from '../../models';
import type { OracleHcmEmployeeResponse } from '../types.js';
import { toStandardEmployee } from '../mappers/to-standard-employee.js';

/**
 * Fetches all employees from Oracle HCM and maps them to the StandardEmployee model
 * Uses valid expand parameters and supports incremental sync using LastUpdateDate
 * Uses onlyData: true to exclude links, and offset/limit for pagination
 */
export default async function fetchData(nango: NangoSync): Promise<void> {
    const lastSyncDate = nango.lastSyncDate;
    let q: string | undefined = undefined;
    if (lastSyncDate) {
        q = `LastUpdateDate>='${lastSyncDate.toISOString()}'`;
    }

    const expand = 'names,addresses,emails,phones';
    const limit = 100;
    let offset = 0;
    let total = 0;
    let batchCount = 0;

    while (true) {
        const proxyConfig: ProxyConfiguration = {
            // https://docs.oracle.com/en/cloud/saas/human-resources/24d/farws/op-workers-get.html
            endpoint: '/hcmRestApi/resources/11.13.18.05/workers',
            retries: 10,
            headers: {
                'REST-Framework-Version': '4'
            },
            params: {
                onlyData: 'true',
                expand,
                offset,
                limit,
                ...(q ? { q } : {})
            }
        };

        const response = await nango.get<{ items: OracleHcmEmployeeResponse[] }>(proxyConfig);
        const employees = response?.data?.items || [];
        if (employees.length === 0) {
            break;
        }
        const mapped = employees.map(toStandardEmployee);
        await nango.log(`Saving batch ${batchCount + 1} of ${mapped.length} employee(s) (offset: ${offset})`);
        await nango.batchSave(mapped, 'StandardEmployee');
        total += mapped.length;
        batchCount++;
        if (employees.length < limit) {
            break;
        }
        offset += limit;
    }
    await nango.log(`Sync complete. Total employees saved: ${total}`);
}
