import type { NangoAction, ProxyConfiguration, UserInformation } from '../../models';
import type { AirtableWhoAmIResponse } from '../types';

export default async function runAction(nango: NangoAction): Promise<UserInformation> {
    const config: ProxyConfiguration = {
        // https://airtable.com/developers/web/api/get-user-id-scopes
        endpoint: '/v0/meta/whoami',
        retries: 10
    };

    const { data } = await nango.get<AirtableWhoAmIResponse>(config);

    const user: UserInformation = {
        id: data.id,
        email: data?.email || null
    };

    return user;
}
