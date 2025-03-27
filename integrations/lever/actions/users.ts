import type { NangoAction, ProxyConfiguration, GetUsers } from '../../models.js';

export default async function runAction(nango: NangoAction): Promise<GetUsers> {
    const config: ProxyConfiguration = {
        // https://hire.lever.co/developer/documentation#list-all-users
        endpoint: `/v1/users`,
        retries: 3
    };

    const resp = await nango.get(config);
    return {
        users: resp.data.data
    };
}
