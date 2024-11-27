import type { AshbyResponse, ChangeSource, NangoAction, ProxyConfiguration } from '../../models.js';

export default async function runAction(nango: NangoAction, input: ChangeSource): Promise<AshbyResponse> {
    if (!input.applicationId) {
        throw new nango.ActionError({
            message: 'applicationId is a required field'
        });
    }

    if (!input.sourceId) {
        throw new nango.ActionError({
            message: 'sourceId is a required field'
        });
    }

    const config: ProxyConfiguration = {
        // https://developers.ashbyhq.com/reference/applicationchangesource
        endpoint: '/application.change_source',
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
