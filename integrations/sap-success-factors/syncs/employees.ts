import { createSync } from 'nango';
import type { SapSuccessFactorsPerPerson } from '../types.js';
import { toEmployee } from '../mappers/to-employee.js';

import type { ProxyConfiguration } from 'nango';
import { Employee } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Fetches a list of current employees from sap success factors',
    version: '2.0.0',
    frequency: 'every 6 hours',
    autoStart: true,
    syncType: 'incremental',
    trackDeletes: false,

    endpoints: [
        {
            method: 'GET',
            path: '/employees',
            group: 'Employees'
        }
    ],

    models: {
        Employee: Employee
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const config: ProxyConfiguration = {
            // https://help.sap.com/docs/successfactors-platform/sap-successfactors-api-reference-guide-odata-v2/perperson
            endpoint: '/odata/v2/PerPerson',
            params: {
                $format: 'json',
                $expand: 'personalInfoNav',
                ...(nango.lastSyncDate && {
                    $filter: `lastModifiedDateTime ge datetime'${nango.lastSyncDate.toISOString()}'`
                })
            },
            paginate: {
                type: 'offset',
                offset_calculation_method: 'by-response-size',
                offset_name_in_request: '$skip',
                offset_start_value: 0,
                limit: 100,
                limit_name_in_request: '$top',
                response_path: 'd.results'
            },
            retries: 10
        };

        for await (const records of nango.paginate<SapSuccessFactorsPerPerson>(config)) {
            const mappedRecords = records.map(toEmployee);
            await nango.batchSave(mappedRecords, 'Employee');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
