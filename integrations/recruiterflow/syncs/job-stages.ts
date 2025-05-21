import type { NangoSync, ProxyConfiguration, RecruiterFlowJobStage } from '../../models';
import type { RecruiterFlowJobStageResponse } from '../types';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const proxyConfig: ProxyConfiguration = {
        // https://recruiterflow.com/api#/Job%20APIs/get_api_external_job_stage_names
        endpoint: '/api/external/job/stage_names',
        retries: 10
    };

    const response = await nango.get<RecruiterFlowJobStageResponse[]>(proxyConfig);
    const stages = response.data;

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
