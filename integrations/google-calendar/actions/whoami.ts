import type { NangoAction, ProxyConfiguration, UserInformation } from '../../models';
import type { GoogleUserInfoResponse } from '../types';

export default async function runAction(nango: NangoAction): Promise<UserInformation> {
    const config: ProxyConfiguration = {
        // https://cloud.google.com/identity-platform/docs/reference/rest/v1/UserInfo
        endpoint: '/oauth2/v1/userinfo',
        params: {
            alt: 'json'
        },
        retries: 3
    };

    const { data } = await nango.get<GoogleUserInfoResponse>(config);

    const info: UserInformation = {
        id: data.id.toString(),
        email: data.email
    };

    return info;
}
