import type { NangoSync, ProxyConfiguration, RecruiterFlowCandidateActivityList } from '../../models';
import type { RecruiterFlowCandidateActivityListResponse } from '../types';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const proxyConfig: ProxyConfiguration = {
        // https://recruiterflow.com/api#/Candidate%20APIs/get_api_external_candidate_activity_list
        endpoint: '/api/external/candidate/activity/list',
        retries: 10
    };

    const response = await nango.get<RecruiterFlowCandidateActivityListResponse[]>(proxyConfig);
    const activities = response.data;

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
