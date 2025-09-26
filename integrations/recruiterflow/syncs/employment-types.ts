import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { RecruiterFlowEmploymentType } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Syncs all employment types from RecruiterFlow',
    version: '2.0.0',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'full',

    endpoints: [
        {
            method: 'GET',
            path: '/employment-types',
            group: 'Employments'
        }
    ],

    models: {
        RecruiterFlowEmploymentType: RecruiterFlowEmploymentType
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const proxyConfig: ProxyConfiguration = {
            // https://recruiterflow.com/api#/Other%20APIs/get_api_external_organization_employment_type_list
            endpoint: '/api/external/organization/employment-type/list',
            retries: 10
        };

        const response = await nango.get<{ data: RecruiterFlowEmploymentType[] }>(proxyConfig);
        const employmentTypes = response.data.data;

        const updatedEmploymentTypes = employmentTypes.map((employmentType) => ({
            ...employmentType,
            id: employmentType.id.toString()
        }));

        await nango.batchSave(updatedEmploymentTypes, 'RecruiterFlowEmploymentType');
    await nango.deleteRecordsFromPreviousExecutions("RecruiterFlowEmploymentType");
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
