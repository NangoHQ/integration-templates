import { createSync } from 'nango';
import type { OracleHcmEmployeeResponse } from '../types.js';
import { toEmployee } from '../mappers/to-employee.js';

import type { ProxyConfiguration } from 'nango';
import { Employee } from '../models.js';
import { z } from 'zod';

/**
 * Fetches all employees from Oracle HCM and saves them in the lowerCamelCase Oracle data model.
 * Uses valid expand parameters and supports incremental sync using LastUpdateDate.
 * Uses onlyData: true to exclude links, and offset/limit for pagination.
 * Incremental: Uses the checkpoint and exits if a record is older than the saved timestamp.
 */
const CheckpointSchema = z.object({
    updated_after: z.string()
});

const sync = createSync({
    description: 'Fetch all employees from Oracle HCM in the native Oracle data model',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,

    endpoints: [
        {
            method: 'GET',
            path: '/employees',
            group: 'Oracle HCM API'
        }
    ],

    models: {
        Employee: Employee
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : undefined;
        const checkpointUpdatedAfter = checkpoint?.updated_after ? new Date(checkpoint.updated_after) : undefined;
        const runStartedAt = new Date().toISOString();

        const expand = 'names,addresses,emails,phones';
        const limit = 100;
        let total = 0;

        const checkpointDate = checkpointUpdatedAfter ? new Date(checkpointUpdatedAfter) : null;

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

            if (checkpointDate) {
                employees = employees.filter((emp) => {
                    const updated = emp.LastUpdateDate ? new Date(emp.LastUpdateDate) : null;
                    if (updated && updated < checkpointDate) {
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
                await nango.log('Encountered record older than checkpoint, exiting early.', { level: 'info' });
                break;
            }
        }
        await nango.log(`Sync complete. Total Oracle employees saved: ${total}`);
        await nango.saveCheckpoint({ updated_after: runStartedAt });

    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
