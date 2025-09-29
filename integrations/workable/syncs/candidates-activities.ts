import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { WorkableCandidateActivity } from '../models.js';
import { z } from 'zod';

const LIMIT = 100;

const sync = createSync({
    description: 'Fetches a list of activity streams of the given candidate',
    version: '1.0.0',
    frequency: 'every 6 hours',
    autoStart: true,
    syncType: 'full',

    endpoints: [
        {
            method: 'GET',
            path: '/workable/candidates-activities'
        }
    ],

    scopes: ['r_candidates'],

    models: {
        WorkableCandidateActivity: WorkableCandidateActivity
    },

    metadata: z.object({}),

    exec: async (nango) => {
        let totalRecords = 0;

        const candidates: any[] = await getAllCandidates(nango);

        for (const candidate of candidates) {
            const config: ProxyConfiguration = {
                // https://workable.readme.io/reference/candidate-activities
                endpoint: `/spi/v3/candidates/${candidate.id}/activities`,
                paginate: {
                    type: 'link',
                    link_path_in_response_body: 'paging.next',
                    limit_name_in_request: 'limit',
                    response_path: 'activities',
                    limit: LIMIT
                }
            };
            for await (const activity of nango.paginate(config)) {
                const mappedActivity: WorkableCandidateActivity[] = activity.map(mapActivity) || [];

                const batchSize: number = mappedActivity.length;
                totalRecords += batchSize;
                await nango.log(`Saving batch of ${batchSize} activitie(s) for candidate ${candidate.id} (total activitie(s): ${totalRecords})`);
                await nango.batchSave(mappedActivity, 'WorkableCandidateActivity');
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

async function getAllCandidates(nango: NangoSyncLocal) {
    const records: any[] = [];
    const proxyConfig: ProxyConfiguration = {
        // https://workable.readme.io/reference/job-candidates-index
        endpoint: '/spi/v3/candidates',
        paginate: {
            type: 'link',
            link_path_in_response_body: 'paging.next',
            limit_name_in_request: 'limit',
            response_path: 'candidates',
            limit: LIMIT
        }
    };

    for await (const recordBatch of nango.paginate(proxyConfig)) {
        records.push(...recordBatch);
    }

    return records;
}

function mapActivity(activity: any): WorkableCandidateActivity {
    return {
        id: activity.id,
        action: activity.action,
        stage_name: activity.stage_name,
        created_at: activity.created_at,
        body: activity.body,
        member: activity.member,
        rating: activity.rating
    };
}
