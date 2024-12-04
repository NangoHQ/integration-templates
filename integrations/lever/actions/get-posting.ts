import type { NangoAction, ProxyConfiguration, SinglePost, SuccessResponse } from '../../models.js';

export default async function runAction(nango: NangoAction, input: SinglePost): Promise<SuccessResponse> {
    const config: ProxyConfiguration = {
        // https://hire.lever.co/developer/documentation#list-all-stages
        endpoint: `/v1/postings/${input.id}`,
        retries: 10
    };

    const resp = await nango.get(config);
    return {
        success: true,
        response: resp.data.data
    };
}
