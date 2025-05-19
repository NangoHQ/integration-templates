import type { NangoSync, ProxyConfiguration } from '../../models';
import { toStandardEmployee } from '../mappers/to-standard-employee.js';
import type { OracleHcmEmployeeResponse } from '../types.js';

/**
 * Fetches all employees from Oracle HCM and maps them to the StandardEmployee model
 * Uses valid expand parameters and supports incremental sync using LastUpdateDate
 * Uses onlyData: true to exclude links, and offset/limit for pagination
 */
export default async function fetchData(nango: NangoSync): Promise<void> {
    const expand = 'names,addresses,emails,phones';
    const limit = 100;
    let total = 0;

    const proxyConfig: ProxyConfiguration = {
        // https://docs.oracle.com/en/cloud/saas/human-resources/24d/farws/op-workers-get.html
        endpoint: '/hcmRestApi/resources/11.13.18.05/workers',
        retries: 10,
        headers: {
            'REST-Framework-Version': '4'
        },
        paginate: {
            type: 'offset',
            offset_name_in_request: 'offset',
            offset_start_value: 0,
            offset_calculation_method: 'by-response-size',
            limit_name_in_request: 'limit',
            limit,
            response_path: 'items'
        },
        params: {
            onlyData: 'true',
            expand
        }
    };
    for await (const response of nango.paginate<OracleHcmEmployeeResponse>(proxyConfig)) {
        const employees = response || [];
        if (employees.length === 0) {
            break;
        }
        const mapped = employees.map(toStandardEmployee);
        await nango.batchSave(mapped, 'StandardEmployee');
        total += mapped.length;
    }
    await nango.log(`Sync complete. Total employees saved: ${total}`);
}
