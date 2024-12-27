import type { NangoAction, ProxyConfiguration, UserInformation } from '../../models';
import type { SalesForceUserInfo } from '../types';

export default async function runAction(nango: NangoAction): Promise<UserInformation> {
    const config: ProxyConfiguration = {
        baseUrlOverride: 'https://login.salesforce.com',
        // https://help.salesforce.com/s/articleView?id=sf.remoteaccess_using_userinfo_endpoint.htm&type=5
        endpoint: '/services/oauth2/userinfo',
        retries: 10
    };

    const { data } = await nango.get<SalesForceUserInfo>(config);

    const user: UserInformation = {
        id: data.user_id,
        email: data.email
    };

    return user;
}
