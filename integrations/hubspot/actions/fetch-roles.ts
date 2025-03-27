import type { NangoAction, ProxyConfiguration, RoleResponse } from '../../models';

export default async function runAction(nango: NangoAction): Promise<RoleResponse> {
    const config: ProxyConfiguration = {
        // https://developers.hubspot.com/docs/api/settings/user-provisioning
        endpoint: `/settings/v3/users/roles`,
        retries: 3
    };
    const response = await nango.get(config);

    return response.data;
}
