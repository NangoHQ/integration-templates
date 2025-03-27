import type { NangoAction, ProxyConfiguration, UserInformation } from '../../models';
import type { HubspotAccessTokenMetadata } from '../types';

export default async function runAction(nango: NangoAction): Promise<UserInformation> {
    const connection = await nango.getConnection();
    if (!('access_token' in connection.credentials)) {
        throw new nango.ActionError({
            message: 'Access token is missing in credentials'
        });
    }
    const config: ProxyConfiguration = {
        // https://developers.hubspot.com/docs/guides/api/app-management/oauth-tokens#retrieve-access-token-metadata
        endpoint: `/oauth/v1/access-tokens/${connection.credentials.access_token}`,
        retries: 3
    };

    const { data } = await nango.get<HubspotAccessTokenMetadata>(config);

    const user: UserInformation = {
        id: data.user_id,
        email: data.user
    };

    return user;
}
