import type { NangoSync, ProxyConfiguration, RecruiterFlowCandidateActivityType } from '../../models';
import type { RecruiterFlowCandidateActivityTypeResponse } from '../types';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const proxyConfig: ProxyConfiguration = {
        // https://recruiterflow.com/api#/Candidate%20APIs/get_api_external_candidate_activity_type_list
        endpoint: '/api/external/candidate/activity-type/list',
        retries: 10
    };

    const response = await nango.get<RecruiterFlowCandidateActivityTypeResponse[]>(proxyConfig);
    const activityTypes = response.data;

    await nango.batchSave(activityTypes.map(toCandidateActivityType), 'RecruiterFlowCandidateActivityType');
}

function toCandidateActivityType(record: RecruiterFlowCandidateActivityTypeResponse): RecruiterFlowCandidateActivityType {
    return {
        id: record.id,
        name: record.name,
        created_at: record.created_at,
        updated_at: record.updated_at
    };
}
