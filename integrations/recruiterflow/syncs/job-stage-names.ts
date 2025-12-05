import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { RecruiterFlowLeanJobStageName } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Syncs all job stage names from RecruiterFlow',
    version: '2.0.0',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'full',

    endpoints: [
        {
            method: 'GET',
            path: '/job-stage-names',
            group: 'Jobs'
        }
    ],

    models: {
        RecruiterFlowLeanJobStageName: RecruiterFlowLeanJobStageName
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const proxyConfig: ProxyConfiguration = {
            // https://recruiterflow.com/api#/Job%20APIs/get_api_external_job_stage_names
            endpoint: '/api/external/job/stage_names',
            retries: 10
        };

        const response = await nango.get<{ data: string[] }>(proxyConfig);
        const stages = response.data.data;

        await nango.batchSave(stages.map(toJobStageName), 'RecruiterFlowLeanJobStageName');
        await nango.deleteRecordsFromPreviousExecutions('RecruiterFlowLeanJobStageName');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

function toJobStageName(record: string): RecruiterFlowLeanJobStageName {
    return {
        id: record,
        name: record
    };
}
