import type { NangoSync, RecruiterFlowJobStage } from '../../models';
import type { RecruiterFlowJobStageResponse } from '../types';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const proxyConfig = {
        endpoint: '/api/external/job/stage_names',
        retries: 10
    };

    const response = await nango.get(proxyConfig);
    const stages = response.data as RecruiterFlowJobStageResponse[];

    await nango.batchSave(stages.map(toJobStage), 'RecruiterFlowJobStage');
}

function toJobStage(record: RecruiterFlowJobStageResponse): RecruiterFlowJobStage {
    return {
        id: record.id,
        name: record.name,
        job_id: record.job_id,
        order: record.order,
        created_at: record.created_at,
        updated_at: record.updated_at
    };
} 