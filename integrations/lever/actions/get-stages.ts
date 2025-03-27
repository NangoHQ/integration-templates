import type { NangoAction, ProxyConfiguration, GetStages } from '../../models.js';

export default async function runAction(nango: NangoAction): Promise<GetStages> {
    const config: ProxyConfiguration = {
        // https://hire.lever.co/developer/documentation#list-all-stages
        endpoint: `/v1/stages`,
        retries: 3
    };

    const resp = await nango.get(config);
    return {
        stages: resp.data.data
    };
}
