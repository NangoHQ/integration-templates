import type { NangoSync, RecruiterFlowCandidateActivity, ProxyConfiguration } from '../../models';
import type { RecruiterFlowCandidateActivityResponse } from '../types';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const proxyConfig: ProxyConfiguration = {
        // https://recruiterflow.com/api#/Candidate%20APIs/get_api_external_candidate_activities_stage_movement_list
        endpoint: '/api/external/candidate/activities/stage-movement/list',
        retries: 10
    };

    const response = await nango.get(proxyConfig);
    const activities = response.data as RecruiterFlowCandidateActivityResponse[];

    await nango.batchSave(activities.map(toCandidateActivity), 'RecruiterFlowCandidateActivity');
}

function toCandidateActivity(record: RecruiterFlowCandidateActivityResponse): RecruiterFlowCandidateActivity {
    return {
        id: record.id,
        candidate_id: record.candidate_id,
        activity_type: record.activity_type,
        stage_from: record.stage_from,
        stage_to: record.stage_to,
        created_at: record.created_at,
        created_by: record.created_by,
        notes: record.notes
    };
}
