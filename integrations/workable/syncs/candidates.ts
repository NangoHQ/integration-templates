import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { WorkableCandidate } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Fetches a list of candidates from workable',
    version: '2.0.0',
    frequency: 'every 6 hours',
    autoStart: true,
    syncType: 'incremental',

    endpoints: [
        {
            method: 'GET',
            path: '/candidates',
            group: 'Candidates'
        }
    ],

    scopes: ['r_candidates'],

    models: {
        WorkableCandidate: WorkableCandidate
    },

    metadata: z.object({}),

    exec: async (nango) => {
        let totalRecords = 0;

        const config: ProxyConfiguration = {
            // https://workable.readme.io/reference/job-candidates-index
            endpoint: '/spi/v3/candidates',
            ...(nango.lastSyncDate ? { params: { created_after: nango.lastSyncDate?.toISOString() } } : {}),
            paginate: {
                type: 'link',
                link_path_in_response_body: 'paging.next',
                limit_name_in_request: 'limit',
                response_path: 'candidates',
                limit: 100
            }
        };
        for await (const candidate of nango.paginate(config)) {
            const mappedCandidate: WorkableCandidate[] = candidate.map(mapCandidate) || [];

            const batchSize: number = mappedCandidate.length;
            totalRecords += batchSize;
            await nango.log(`Saving batch of ${batchSize} candidate(s) (total candidate(s): ${totalRecords})`);
            await nango.batchSave(mappedCandidate, 'WorkableCandidate');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

function mapCandidate(candidate: any): WorkableCandidate {
    return {
        id: candidate.id,
        name: candidate.name,
        firstname: candidate.firstname,
        lastname: candidate.lastname,
        headline: candidate.headline,
        account: candidate.account,
        job: candidate.job,
        stage: candidate.stage,
        disqualified: candidate.disqualified,
        disqualification_reason: candidate.disqualification_reason,
        hired_at: candidate.hired_at,
        sourced: candidate.sourced,
        profile_url: candidate.profile_url,
        address: candidate.address,
        phone: candidate.phone,
        email: candidate.email,
        domain: candidate.domain,
        created_at: candidate.created_at,
        updated_at: candidate.updated_after
    };
}
