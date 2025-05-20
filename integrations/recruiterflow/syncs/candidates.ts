import type { NangoSync, RecruiterFlowCandidate } from '../../models';
import type { RecruiterFlowCandidateResponse } from '../types';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const proxyConfig = {
        endpoint: '/api/external/candidate/list',
        retries: 10
    };

    const response = await nango.get(proxyConfig);
    const candidates = response.data as RecruiterFlowCandidateResponse[];

    await nango.batchSave(candidates.map(toCandidate), 'RecruiterFlowCandidate');
}

function toCandidate(record: RecruiterFlowCandidateResponse): RecruiterFlowCandidate {
    return {
        id: record.id,
        first_name: record.first_name,
        last_name: record.last_name,
        email: record.email,
        phone: record.phone,
        current_stage: record.current_stage,
        current_job: record.current_job,
        created_at: record.created_at,
        updated_at: record.updated_at,
        source: record.source,
        status: record.status,
        tags: record.tags,
        custom_fields: record.custom_fields
    };
} 