import { createSync } from "nango";
import { toStandardEmployee } from '../mappers/to-standard-employee.js';
import type { OracleHcmEmployeeResponse } from '../types.js';

import type { ProxyConfiguration } from "nango";
import { StandardEmployee } from "../models.js";
import { z } from "zod";

/**
 * Fetches all employees from Oracle HCM and maps them to the StandardEmployee model
 * Uses valid expand parameters and supports incremental sync using LastUpdateDate
 * Uses onlyData: true to exclude links, and offset/limit for pagination
 * Incremental: Uses nango.lastSyncDate and exits if a record is older than lastSyncDate
 */
const sync = createSync({
    description: "Fetch all employees from Oracle HCM",
    version: "1.0.0",
    frequency: "every hour",
    autoStart: true,
    syncType: "incremental",
    trackDeletes: false,

    endpoints: [{
        method: "GET",
        path: "/employees/unified",
        group: "Unified HRIS API"
    }],

    models: {
        StandardEmployee: StandardEmployee
    },

    metadata: z.object({}),

    exec: async nango => {
        const expand = 'names,addresses,emails,phones';
        const limit = '100';
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
                const mapped = employees.map(toStandardEmployee);
                await nango.batchSave(mapped, 'StandardEmployee');
                total += mapped.length;
                await nango.log(`Saved ${mapped.length} employees`, { level: 'info' });
            }

            if (shouldExit) {
                await nango.log('Encountered record older than lastSyncDate, exiting early.', { level: 'info' });
                break;
            }
        }
        await nango.log(`Sync complete. Total employees saved: ${total}`);
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;
