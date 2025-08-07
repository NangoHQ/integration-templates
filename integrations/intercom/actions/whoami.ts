import type { NangoAction, ProxyConfiguration, UserInformation } from '../../models.js';
import type { WhoAmIResponse } from '../types.js';

export default async function runAction(nango: NangoAction): Promise<UserInformation> {
    const config: ProxyConfiguration = {
        // https://developers.intercom.com/docs/references/1.1/rest-api/admins/viewing-the-current-admin
        endpoint: 'me',
        retries: 3
    };

    const { data } = await nango.get<WhoAmIResponse>(config);

    const user: UserInformation = {
        id: data.id,
        email: data.email
    };

    return user;
}
