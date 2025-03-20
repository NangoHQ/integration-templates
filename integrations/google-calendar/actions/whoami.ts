import type { NangoAction, ProxyConfiguration, UserInformation } from '../../models';
import type { UserInfoResponse } from '../types';

export default async function runAction(nango: NangoAction): Promise<UserInformation> {
    const config: ProxyConfiguration = {
        // https://cloud.google.com/identity-platform/docs/reference/rest/v1/UserInfo
        endpoint: '/oauth2/v1/userinfo',
        params: {
            alt: 'json'
        }
    };

    const { data } = await nango.get<UserInfoResponse>(config);

    const info: UserInformation = {
        id: data.id.toString(),
        email: data.email
    };

    return info;
}
