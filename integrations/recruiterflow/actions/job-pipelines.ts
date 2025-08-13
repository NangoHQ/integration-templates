import { createAction } from 'nango';
import { recruiterFlowPipelineInputSchema } from '../schema.zod.js';

import type { ProxyConfiguration } from 'nango';
import { RecruiterFlowJobPipeline, RecruiterFlowPipelineInput } from '../models.js';

const action = createAction({
    description: 'Fetches all job pipelines from RecruiterFlow',
    version: '2.0.0',

    endpoint: {
        method: 'GET',
        path: '/job-pipelines',
        group: 'Jobs'
    },

    input: RecruiterFlowPipelineInput,
    output: RecruiterFlowJobPipeline,

    exec: async (nango, input): Promise<RecruiterFlowJobPipeline> => {
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
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
