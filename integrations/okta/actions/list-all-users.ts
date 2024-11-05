import type { NangoAction, ProxyConfiguration } from '../../models';

export default async function runAction(nango: NangoAction): Promise<any> {
    const config: ProxyConfiguration = {
        // https://developer.okta.com/docs/api/openapi/okta-management/management/tag/User/#tag/User/operation/listUsers
        endpoint: `/api/v1/users`,
        retries: 10
    };
    const response = await nango.get(config);

    return response.data;
}