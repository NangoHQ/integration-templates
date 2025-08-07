import type { NangoSync, ProxyConfiguration } from '../../models.js';
import type { GemCandidate } from '../types.js';
import { toCandidate } from '../mappers/to-candidate.js';

export default async function fetchData(nango: NangoSync): Promise<void> {
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
