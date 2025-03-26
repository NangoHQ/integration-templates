import type { AshbyResponse, CreateCandidate, NangoAction, ProxyConfiguration } from '../../models.js';

export default async function runAction(nango: NangoAction, input: CreateCandidate): Promise<AshbyResponse> {
    if (!input.name) {
        throw new nango.ActionError({
            message: 'name is a required field'
        });
    }

    const config: ProxyConfiguration = {
        // https://developers.ashbyhq.com/reference/candidatecreate
        endpoint: '/candidate.create',
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
