import type { NangoSync, RecruiterFlowCandidateActivity } from '../../models';
import type { RecruiterFlowCandidateActivityResponse } from '../types';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const proxyConfig = {
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