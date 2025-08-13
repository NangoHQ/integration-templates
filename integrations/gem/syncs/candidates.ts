import { createSync } from 'nango';
import type { GemCandidate } from '../types.js';
import { toCandidate } from '../mappers/to-candidate.js';

import type { ProxyConfiguration } from 'nango';
import { Candidate } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Get all candidates from Gem ATS',
    version: '1.0.0',
    frequency: 'every 1h',
    autoStart: true,
    syncType: 'incremental',
    trackDeletes: false,

    endpoints: [
        {
            method: 'GET',
            path: '/candidates',
            group: 'Candidates'
        }
    ],

    models: {
        Candidate: Candidate
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const proxyConfig: ProxyConfiguration = {
            // https://api.gem.com/ats/v0/reference#tag/Candidate/paths/~1ats~1v0~1candidates~1/get
            endpoint: '/ats/v0/candidates',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                limit_name_in_request: 'per_page',
                limit: 100
            },
            params: {
                include_deleted: 'true',
                ...(nango.lastSyncDate && { updated_after: nango.lastSyncDate.toISOString() })
            },
            retries: 10
        };

        for await (const candidates of nango.paginate<GemCandidate>(proxyConfig)) {
            const mappedCandidates = candidates.map(toCandidate);
            const deletedCandidates = mappedCandidates.filter((candidate) => candidate.deleted_at);
            const activeCandidates = mappedCandidates.filter((candidate) => !candidate.deleted_at);

            if (deletedCandidates.length > 0) {
                await nango.batchDelete(deletedCandidates, 'Candidate');
            }

            if (activeCandidates.length > 0) {
                await nango.batchSave(activeCandidates, 'Candidate');
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
