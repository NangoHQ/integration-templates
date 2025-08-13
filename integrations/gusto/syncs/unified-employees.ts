import { createSync } from 'nango';
import type { EmployeeResponse } from '../types.js';
import { toStandardEmployee } from '../mappers/to-standard-employee.js';

import type { ProxyConfiguration } from 'nango';
import { StandardEmployee } from '../models.js';
import { z } from 'zod';

/**
 * Fetches all employees from Gusto and maps them to the StandardEmployee model
 */
const sync = createSync({
    description: 'Fetches all employees from Gusto and maps them to the standard HRIS model',
    version: '1.0.0',
    frequency: 'every 5m',
    autoStart: false,
    syncType: 'incremental',
    trackDeletes: false,

    endpoints: [
        {
            method: 'GET',
            path: '/employees/unified',
            group: 'Unified HRIS API'
        }
    ],

    models: {
        StandardEmployee: StandardEmployee
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const connection = await nango.getConnection();

        const companyUuid = connection.connection_config['companyUuid'];

        if (!companyUuid) {
            throw new nango.ActionError({
                message: 'Company UUID is missing from the connection configuration'
            });
        }

        const proxyConfig: ProxyConfiguration = {
            // https://docs.gusto.com/embedded-payroll/reference/get-v1-companies-company_id-employees
            endpoint: `/v1/companies/${companyUuid}/employees`,
            retries: 10,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                response_path: '',
                limit_name_in_request: 'per_page',
                limit: 100
            }
        };

        for await (const employees of nango.paginate<EmployeeResponse>(proxyConfig)) {
            // Map employees to StandardEmployee model
            const mappedEmployees = employees.map(toStandardEmployee);

            await nango.log(`Saving batch of ${mappedEmployees.length} employee(s)`);
            await nango.batchSave(mappedEmployees, 'StandardEmployee');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
