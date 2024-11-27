import type { AshbyResponse, NangoAction, ProxyConfiguration } from '../../models.js';
import type { InterviewStageList } from '../types.js';

export default async function runAction(nango: NangoAction, input: InterviewStageList): Promise<AshbyResponse> {
    const config: ProxyConfiguration = {
        // https://developers.ashbyhq.com/reference/interviewstagelist
        endpoint: `/interviewStage.list`,
        data: input,
        retries: 10
    };

    const response = await nango.post(config);
    return {
        success: response.data.success,
        errors: response.data?.errors,
        results: response.data?.results
    };
}
