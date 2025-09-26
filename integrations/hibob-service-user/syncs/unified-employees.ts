import { createSync } from 'nango';
import { toStandardEmployee } from '../mappers/to-standard-employee.js';
import type { HibobEmployeeResponse } from '../types.js';

import type { ProxyConfiguration } from 'nango';
import { StandardEmployee } from '../models.js';
import { z } from 'zod';

interface HibobResponse {
    employees: HibobEmployeeResponse[];
}

/**
 * Fetches all employees from HiBob and maps them to the standardized HRIS model
 * API Documentation: https://apidocs.hibob.com/reference/people_get_people_search
 */
const sync = createSync({
    description: 'Fetches a list of all employees and maps them to the standardized HRIS model',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'full',

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
        const proxyConfig: ProxyConfiguration = {
            // https://apidocs.hibob.com/reference/post_people-search
            endpoint: '/v1/people/search',
            data: {},
            retries: 10
        };

        const response = await nango.post<HibobResponse>(proxyConfig);

        if (!response.data) {
            await nango.log('No data received from HiBob API');
            return;
        }

        if (!Array.isArray(response.data.employees)) {
            await nango.log('Invalid response format: employees is not an array');
            return;
        }

        const employees = response.data.employees.map(toStandardEmployee);

        if (employees.length === 0) {
            await nango.log('No employees found');
            return;
        }

        await nango.log(`Found ${employees.length} employees`);
        await nango.batchSave(employees, 'StandardEmployee');
    await nango.deleteRecordsFromPreviousExecutions("StandardEmployee");
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
