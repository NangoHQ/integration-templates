import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { RecruiterFlowCandidateActivityType } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Syncs all candidate activity types from RecruiterFlow',
    version: '2.0.0',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'full',

    endpoints: [
        {
            method: 'GET',
            path: '/candidate-activity-types',
            group: 'Candidates'
        }
    ],

    models: {
        RecruiterFlowCandidateActivityType: RecruiterFlowCandidateActivityType
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const proxyConfig: ProxyConfiguration = {
            // https://recruiterflow.com/api#/Candidate%20APIs/get_api_external_candidate_activity_type_list
            endpoint: '/api/external/candidate/activity-type/list',
            retries: 10
        };

        const response = await nango.get<{ data: RecruiterFlowCandidateActivityType[] }>(proxyConfig);
        const activityTypes = response.data.data;

        const updatedActivityTypes = activityTypes.map((activityType) => ({
            ...activityType,
            id: activityType.id.toString()
        }));

        await nango.batchSave(updatedActivityTypes, 'RecruiterFlowCandidateActivityType');
        await nango.deleteRecordsFromPreviousExecutions('RecruiterFlowCandidateActivityType');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
