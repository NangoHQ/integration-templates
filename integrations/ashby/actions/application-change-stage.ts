import type { AshbyResponse, ChangeStage, NangoAction, ProxyConfiguration } from '../../models.js';

export default async function runAction(nango: NangoAction, input: ChangeStage): Promise<AshbyResponse> {
    if (!input.applicationId) {
        throw new nango.ActionError({
            message: 'applicationId is a required field'
        });
    }

    if (!input.interviewStageId) {
        throw new nango.ActionError({
            message: 'interviewStageId is a required field'
        });
    }

    const config: ProxyConfiguration = {
        // https://developers.ashbyhq.com/reference/applicationchangestage
        endpoint: '/application.change_stage',
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
