import { createSync } from 'nango';
import type { EmployeeResponse } from '../types.js';
import { toStandardEmployee } from '../mappers/to-standard-employee.js';

import type { ProxyConfiguration } from 'nango';
import { StandardEmployee } from '../models.js';
import { z } from 'zod';

const CheckpointSchema = z.object({
    page: z.number().int().positive()
});

/**
 * Fetches all employees from Gusto and maps them to the StandardEmployee model
 */
const sync = createSync({
    description: 'Fetches all employees from Gusto and maps them to the standard HRIS model',
    version: '1.1.0',
    frequency: 'every 5m',
    autoStart: false,
    syncType: 'full',

    endpoints: [
        {
            method: 'GET',
            path: '/employees/unified',
            group: 'Unified HRIS API'
        }
    ],

    checkpoint: CheckpointSchema,

    models: {
        StandardEmployee: StandardEmployee
    },

    metadata: z.object({}),

    exec: async (nango) => {
        // Blocker: the Gusto employees endpoint is only offset-paginated and does not expose a
        // changed-since filter, deleted-record endpoint, or resumable cursor. We checkpoint the
        // page number so a full refresh can resume within the execution window instead of
        // restarting from page 1.
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint == null ? undefined : CheckpointSchema.parse(rawCheckpoint);
        let page: number | undefined = checkpoint?.page ?? 1;

        const connection = await nango.getConnection();

        const companyUuid = connection.connection_config['companyUuid'];

        if (!companyUuid) {
            throw new nango.ActionError({
                message: 'Company UUID is missing from the connection configuration'
            });
        }

        await nango.trackDeletesStart('StandardEmployee');

        const proxyConfig: ProxyConfiguration = {
            // https://docs.gusto.com/embedded-payroll/reference/get-v1-companies-company_id-employees
            endpoint: `/v1/companies/${companyUuid}/employees`,
            retries: 10,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: page,
                offset_calculation_method: 'per-page',
                response_path: '',
                limit_name_in_request: 'per_page',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    page = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            }
        };

        for await (const employees of nango.paginate<EmployeeResponse>(proxyConfig)) {
            // Map employees to StandardEmployee model
            const mappedEmployees = employees.map(toStandardEmployee);

            await nango.log(`Saving batch of ${mappedEmployees.length} employee(s)`);
            await nango.batchSave(mappedEmployees, 'StandardEmployee');

            if (page !== undefined) {
                await nango.saveCheckpoint({ page });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('StandardEmployee');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
