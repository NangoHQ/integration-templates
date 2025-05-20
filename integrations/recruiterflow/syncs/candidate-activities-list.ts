import type { NangoSync, RecruiterFlowCandidateActivityList } from '../../models';
import type { RecruiterFlowCandidateActivityListResponse } from '../types';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const proxyConfig = {
        endpoint: '/api/external/candidate/activity/list',
        retries: 10
    };

    const response = await nango.get(proxyConfig);
    const activities = response.data as RecruiterFlowCandidateActivityListResponse[];

    await nango.batchSave(activities.map(toCandidateActivityList), 'RecruiterFlowCandidateActivityList');
}

function toCandidateActivityList(record: RecruiterFlowCandidateActivityListResponse): RecruiterFlowCandidateActivityList {
    return {
        id: record.id,
        candidate_id: record.candidate_id,
        activity_type_id: record.activity_type_id,
        created_at: record.created_at,
        created_by: record.created_by,
        notes: record.notes,
        metadata: record.metadata
    };
} 