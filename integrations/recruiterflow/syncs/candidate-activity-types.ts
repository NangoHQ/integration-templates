import type { NangoSync, RecruiterFlowCandidateActivityType, ProxyConfiguration } from '../../models.js';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const proxyConfig: ProxyConfiguration = {
        // https://recruiterflow.com/api#/Candidate%20APIs/get_api_external_candidate_activity_type_list
        endpoint: '/api/external/candidate/activity-type/list',
        retries: 10
    };

    const response = await nango.get<{ data: RecruiterFlowCandidateActivityType[] }>(proxyConfig);
    const activityTypes = response.data.data;

    await nango.batchSave(activityTypes, 'RecruiterFlowCandidateActivityType');
}
