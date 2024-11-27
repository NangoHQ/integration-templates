import type { NangoAction, ProxyConfiguration, SuccessResponse } from '../../models.js';

export default async function runAction(nango: NangoAction): Promise<SuccessResponse> {
    const config: ProxyConfiguration = {
        // https://hire.lever.co/developer/documentation#list-all-stages
        endpoint: `/v1/postings`,
        retries: 10
    };

    const resp = await nango.get(config);
    return {
        response: resp.data.data,
        success: true
    };
}
