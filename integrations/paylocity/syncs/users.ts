import { createSync } from 'nango';
import type { PaylocityUser, PaylocityUsersResp } from '../types.js';

import type { ProxyConfiguration } from 'nango';
import { User } from '../models.js';
import { z } from 'zod';

/**
 * Sync: fetchPaylocityEmployees
 * 1) Lists all employees (employeeId only) with offset pagination
 * 2) For each, calls GET /employees/{employeeId} to get full details
 * 3) Extracts { id, firstName, lastName, email } and batchSave
 */
const sync = createSync({
    description: 'Fetch employees from Paylocity.',
    version: '1.0.0',
    frequency: 'every day',
    autoStart: true,
    syncType: 'full',

    endpoints: [
        {
            method: 'GET',
            path: '/users',
            group: 'Users'
        }
    ],

    models: {
        User: User
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const connection = await nango.getConnection();
        const companyId = connection.connection_config['companyId'];

        const listConfig: ProxyConfiguration = {
            //https://developer.paylocity.com/integrations/reference/get-all-employees
            endpoint: `/api/v2/companies/${companyId}/employees`,
            retries: 10,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'pagenumber',
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'pagesize',
                limit: 100
            }
        };

        for await (const employeesPage of nango.paginate<PaylocityUsersResp>(listConfig)) {
            const userBatch: User[] = [];

            for (const partialEmp of employeesPage) {
                if (!partialEmp.employeeId) {
                    continue;
                }

                const getConfig: ProxyConfiguration = {
                    // https://developer.paylocity.com/integrations/reference/get-employee
                    endpoint: `/api/v2/companies/${companyId}/employees/${partialEmp.employeeId}`,
                    retries: 10
                };
                const detailsResp = await nango.get<PaylocityUser>(getConfig);
                const fullEmp = detailsResp.data;

                const email = fullEmp.homeAddress?.emailAddress || fullEmp.workAddress?.emailAddress || '';

                const user = {
                    id: fullEmp.employeeId,
                    firstName: fullEmp.firstName || '',
                    lastName: fullEmp.lastName || '',
                    email
                };

                userBatch.push(user);
            }

            if (userBatch.length > 0) {
                await nango.batchSave(userBatch, 'User');
            }
        }
    await nango.deleteRecordsFromPreviousExecutions("User");
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
