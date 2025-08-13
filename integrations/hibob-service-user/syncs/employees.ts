import { createSync } from 'nango';
import { toHibobEmployee } from '../mappers/to-hibob-employee.js';

import type { ProxyConfiguration } from 'nango';
import { HibobEmployee } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Fetches a list of all active employees',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'full',
    trackDeletes: true,

    endpoints: [
        {
            method: 'GET',
            path: '/employees',
            group: 'Employees'
        }
    ],

    models: {
        HibobEmployee: HibobEmployee
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const proxyConfig: ProxyConfiguration = {
            // https://api.hibob.com/v1/people/search
            endpoint: '/v1/people/search',
            data: {},
            retries: 10
        };

        const response = await nango.post(proxyConfig);
        const employees = response.data.employees;
        const chunkSize = 100;

        for (let i = 0; i < employees.length; i += chunkSize) {
            const chunk = employees.slice(i, i + chunkSize);
            const mappedEmployees = toHibobEmployee(chunk);
            const batchSize = mappedEmployees.length;

            await nango.log(`Saving batch of ${batchSize} employee(s)`);
            await nango.batchSave(mappedEmployees, 'HibobEmployee');
        }

        await nango.log(`Total employee(s) processed: ${employees.length}`);
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
