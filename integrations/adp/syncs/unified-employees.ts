import { createSync } from 'nango';
import type { ADPEmployee } from '../types.js';
import { toStandardEmployee } from '../mappers/to-standard-employee.js';

import type { ProxyConfiguration } from 'nango';
import { StandardEmployee } from '../models.js';
import * as z from 'zod';

const CheckpointSchema = z.object({
    offset: z.number().int().min(0)
});

const sync = createSync({
    description: 'Fetches a list of current employees from ADP and maps them to the standard HRIS model',
    version: '0.1.0',
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

    checkpoint: CheckpointSchema,

    models: {
        StandardEmployee: StandardEmployee
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = CheckpointSchema.parse(rawCheckpoint ?? { offset: 0 });

        await nango.trackDeletesStart('StandardEmployee');

        let total = 0;
        let nextOffset: number | undefined = checkpoint.offset;

        const proxyConfig: ProxyConfiguration = {
            // https://developers.adp.com/apis/api-explorer/hcm-offrg-wfn/hcm-offrg-wfn-hr-workers-v2-workers?operation=GET%2Fhr%2Fv2%2Fworkers#swagger
            endpoint: '/hr/v2/workers',
            params: {
                count: 'true'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: '$skip',
                offset_start_value: nextOffset,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: '$top',
                limit: 100,
                response_path: 'workers',
                on_page: async ({ nextPageParam }) => {
                    nextOffset = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
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

            if (nextOffset !== undefined) {
                await nango.saveCheckpoint({ offset: nextOffset });
            }
        }

        await nango.log(`Total unified employee(s) processed: ${total}`);
        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('StandardEmployee');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
