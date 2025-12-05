import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { RecruiterFlowJobDepartment } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Syncs all job departments from RecruiterFlow',
    version: '2.0.0',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'full',

    endpoints: [
        {
            method: 'GET',
            path: '/job-departments',
            group: 'Jobs'
        }
    ],

    models: {
        RecruiterFlowJobDepartment: RecruiterFlowJobDepartment
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const proxyConfig: ProxyConfiguration = {
            // https://recruiterflow.com/api#/Job%20APIs/get_api_external_job_department_list
            endpoint: '/api/external/job/department/list',
            retries: 10
        };

        const response = await nango.get<{ data: RecruiterFlowJobDepartment[] }>(proxyConfig);
        const departments = response.data.data;

        const mappedDepartments = departments.map((department) => ({
            ...department,
            id: department.id.toString()
        }));

        await nango.batchSave(mappedDepartments, 'RecruiterFlowJobDepartment');
        await nango.deleteRecordsFromPreviousExecutions('RecruiterFlowJobDepartment');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
