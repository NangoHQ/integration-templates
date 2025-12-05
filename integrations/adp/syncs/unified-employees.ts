import { createSync } from 'nango';
import type { ADPEmployee } from '../types.js';
import { toStandardEmployee } from '../mappers/to-standard-employee.js';

import type { ProxyConfiguration } from 'nango';
import { StandardEmployee } from '../models.js';
import * as z from 'zod';

const sync = createSync({
    description: 'Fetches a list of current employees from ADP and maps them to the standard HRIS model',
    version: '0.0.1',
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
        let total = 0;

        const proxyConfig: ProxyConfiguration = {
            // https://developers.adp.com/apis/api-explorer/hcm-offrg-wfn/hcm-offrg-wfn-hr-workers-v2-workers?operation=GET%2Fhr%2Fv2%2Fworkers#swagger
            endpoint: '/hr/v2/workers',
            params: {
                count: 'true'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: '$skip',
                offset_start_value: 0,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: '$top',
                limit: 100,
                response_path: 'workers'
            },
            retries: 10
        };

        for await (const response of nango.paginate<ADPEmployee>(proxyConfig)) {
            const employees = response;
            const mappedEmployees = employees.map(toStandardEmployee);
            const batchSize = mappedEmployees.length;

            await nango.log(`Saving batch of ${batchSize} unified employee(s)`);
            await nango.batchSave(mappedEmployees, 'StandardEmployee');
            total += batchSize;
        }

        await nango.log(`Total unified employee(s) processed: ${total}`);
        await nango.deleteRecordsFromPreviousExecutions('StandardEmployee');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
