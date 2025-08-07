import type { NangoAction, ProxyConfiguration, UserRoleInput, ChangedRoleResponse } from '../../models.js';

export default async function runAction(nango: NangoAction, input: UserRoleInput): Promise<ChangedRoleResponse> {
    if (!input.id) {
        throw new nango.ActionError({
            message: 'Id is required'
        });
    }

    const { id, ...data } = input;

    const config: ProxyConfiguration = {
        // https://developers.hubspot.com/docs/api/settings/user-provisioning
        endpoint: `/settings/v3/users/${input.id}`,
        data,
        retries: 3
    };
    const response = await nango.put(config);

    return response.data;
}
