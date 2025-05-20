import type { NangoSync, RecruiterFlowCandidateActivityType } from '../../models';
import type { RecruiterFlowCandidateActivityTypeResponse } from '../types';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const proxyConfig = {
        endpoint: '/api/external/candidate/activity-type/list',
        retries: 10
    };

    const response = await nango.get(proxyConfig);
    const activityTypes = response.data as RecruiterFlowCandidateActivityTypeResponse[];

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