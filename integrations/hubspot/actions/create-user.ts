import type { NangoAction, ProxyConfiguration, CreateUser, CreatedUser } from '../../models';

export default async function runAction(nango: NangoAction, input: CreateUser): Promise<CreatedUser> {
    if (!input.email) {
        throw new nango.ActionError({
            message: 'Email is required'
        });
    }

    const config: ProxyConfiguration = {
        // https://developers.hubspot.com/docs/api/settings/user-provisioning
        endpoint: `/settings/v3/users`,
        data: input,
        retries: 3
    };
    const response = await nango.post(config);

    return response.data;
}
