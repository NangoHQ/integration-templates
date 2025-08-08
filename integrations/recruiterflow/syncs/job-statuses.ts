import { createSync } from 'nango';
import type { RecruiterFlowJobStatusResponse } from '../types.js';

import type { ProxyConfiguration } from 'nango';
import { RecruiterFlowJobStatus } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Syncs all job statuses from RecruiterFlow',
    version: '2.0.0',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'full',
    trackDeletes: true,

    endpoints: [
        {
            method: 'GET',
            path: '/job-statuses',
            group: 'Jobs'
        }
    ],

    models: {
        RecruiterFlowJobStatus: RecruiterFlowJobStatus
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const proxyConfig: ProxyConfiguration = {
            // https://recruiterflow.com/api#/Job%20APIs/get_api_external_job_status_list
            endpoint: '/api/external/job-status/list',
            retries: 10
        };

        const response = await nango.get<{ data: RecruiterFlowJobStatusResponse[] }>(proxyConfig);
        const statuses = response.data.data;

        await nango.batchSave(statuses.map(toJobStatus), 'RecruiterFlowJobStatus');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

function toJobStatus(record: RecruiterFlowJobStatusResponse): RecruiterFlowJobStatus {
    return {
        id: record.id.toString(),
        name: record.name,
        color: record.color
    };
}
