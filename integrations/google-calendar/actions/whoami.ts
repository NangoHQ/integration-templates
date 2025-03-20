import type { NangoAction, ProxyConfiguration, UserInformation } from '../../models';
import type { UserInfoResponse } from '../types';

/**
 * Retrieves user information from the Google Identity Platform.
 *
 * This asynchronous function uses a Nango client to fetch user details from the '/oauth2/v1/userinfo' endpoint with JSON formatting enabled.
 * The response data is processed to construct a UserInformation object, converting the user id to a string.
 *
 * @returns A promise that resolves to a UserInformation object containing the user's id and email.
 */
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
