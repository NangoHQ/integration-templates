import type { NangoSync, ProxyConfiguration, RecruiterFlowJobPipeline } from '../../models';
import type { RecruiterFlowJobPipelineResponse } from '../types';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const proxyConfig: ProxyConfiguration = {
        // https://recruiterflow.com/api#/Job%20APIs/get_api_external_job_pipeline
        endpoint: '/api/external/job/pipeline',
        retries: 10
    };

    const response = await nango.get<RecruiterFlowJobPipelineResponse[]>(proxyConfig);
    const pipelines = response.data;

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
