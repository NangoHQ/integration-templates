import type { NangoSync, RecruiterFlowJobPipeline } from '../../models';
import type { RecruiterFlowJobPipelineResponse } from '../types';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const proxyConfig = {
        endpoint: '/api/external/job/pipeline',
        retries: 10
    };

    const response = await nango.get(proxyConfig);
    const pipelines = response.data as RecruiterFlowJobPipelineResponse[];

    await nango.batchSave(pipelines.map(toJobPipeline), 'RecruiterFlowJobPipeline');
}

function toJobPipeline(record: RecruiterFlowJobPipelineResponse): RecruiterFlowJobPipeline {
    return {
        id: record.id,
        job_id: record.job_id,
        stages: record.stages,
        created_at: record.created_at,
        updated_at: record.updated_at
    };
} 