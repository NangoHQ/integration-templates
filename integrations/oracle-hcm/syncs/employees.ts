import type { NangoSync, ProxyConfiguration, Employee } from '../../models.js';
import type { OracleHcmEmployeeResponse } from '../types.js';
import { toEmployee } from '../mappers/to-employee.js';

/**
 * Fetches all employees from Oracle HCM and saves them in the lowerCamelCase Oracle data model.
 * Uses valid expand parameters and supports incremental sync using LastUpdateDate.
 * Uses onlyData: true to exclude links, and offset/limit for pagination.
 * Incremental: Uses nango.lastSyncDate and exits if a record is older than lastSyncDate.
 */
export default async function fetchData(nango: NangoSync): Promise<void> {
    const expand = 'names,addresses,emails,phones';
    const limit = 100;
    let total = 0;

    const lastSyncDate = nango.lastSyncDate ? new Date(nango.lastSyncDate) : null;

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
            expand,
            orderBy: 'LastUpdateDate:desc'
        }
    };

    let shouldExit = false;
    for await (const response of nango.paginate<OracleHcmEmployeeResponse>(proxyConfig)) {
        let employees = response || [];
        if (employees.length === 0) {
            break;
        }

        if (lastSyncDate) {
            employees = employees.filter((emp) => {
                const updated = emp.LastUpdateDate ? new Date(emp.LastUpdateDate) : null;
                if (updated && updated < lastSyncDate) {
                    shouldExit = true;
                    return false;
                }
                return true;
            });
        }

        if (employees.length > 0) {
            const mapped: Employee[] = employees.map(toEmployee);
            await nango.batchSave(mapped, 'Employee');
            total += mapped.length;
            await nango.log(`Saved ${mapped.length} Oracle employees`, { level: 'info' });
        }

        if (shouldExit) {
            await nango.log('Encountered record older than lastSyncDate, exiting early.', { level: 'info' });
            break;
        }
    }
    await nango.log(`Sync complete. Total Oracle employees saved: ${total}`);
}
