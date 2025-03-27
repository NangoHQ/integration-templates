import type { AshbyResponse, NangoAction, ProxyConfiguration, UpdateHistory } from '../../models.js';

export default async function runAction(nango: NangoAction, input: UpdateHistory): Promise<AshbyResponse> {
    if (!input.applicationId) {
        throw new nango.ActionError({
            message: 'applicationId is a required field'
        });
    }

    if (!input.applicationHistory) {
        throw new nango.ActionError({
            message: 'applicationHistory is a required field'
        });
    }

    const config: ProxyConfiguration = {
        // https://developers.ashbyhq.com/reference/applicationupdatehistory
        endpoint: '/application.updateHistory',
        data: input,
        retries: 3
    };

    const response = await nango.post(config);
    return {
        success: response.data.success,
        errors: response.data?.errors,
        results: response.data?.results
    };
}
