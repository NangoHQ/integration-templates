import type { AshbyResponse, NangoAction, ProxyConfiguration, UpdateApplication } from '../../models.js';

export default async function runAction(nango: NangoAction, input: UpdateApplication): Promise<AshbyResponse> {
    if (!input.applicationId) {
        throw new nango.ActionError({
            message: 'applicationId is a required field'
        });
    }

    const config: ProxyConfiguration = {
        // https://developers.ashbyhq.com/reference/applicationupdate
        endpoint: '/application.update',
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
