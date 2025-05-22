import type { NangoAction, RecruiterFlowPipelineInput, RecruiterFlowJobPipeline, ProxyConfiguration } from '../../models';
import { recruiterFlowPipelineInputSchema } from '../schema.zod.js';

export default async function runAction(nango: NangoAction, input: RecruiterFlowPipelineInput): Promise<RecruiterFlowJobPipeline> {
    const parsedInput = await nango.zodValidateInput({ zodSchema: recruiterFlowPipelineInputSchema, input });

    const proxyConfig: ProxyConfiguration = {
        // https://recruiterflow.com/api#/Job%20APIs/get_api_external_job_pipeline
        endpoint: '/api/external/job/pipeline',
        retries: 10,
        params: parsedInput.data
    };

    const response = await nango.get<RecruiterFlowJobPipeline>(proxyConfig);
    const pipeline = response.data;

    return pipeline;
}
