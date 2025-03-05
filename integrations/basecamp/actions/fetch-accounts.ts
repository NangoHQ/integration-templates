import type { UserInformation, NangoAction, ProxyConfiguration } from '../../models';
import type { BasecampAuthorizationResponse } from '../types';

export default async function runAction(nango: NangoAction): Promise<UserInformation> {
    const config: ProxyConfiguration = {
        baseUrlOverride: 'https://launchpad.37signals.com',
        // https://github.com/basecamp/api/blob/master/sections/authentication.md#get-authorization
        endpoint: '/authorization.json',
        retries: 10
    };

    const { data } = await nango.get<BasecampAuthorizationResponse>(config);
    const { identity, accounts } = data;

    return {
        identity: {
            id: identity.id,
            email: identity.email_address,
            firstName: identity.first_name,
            lastName: identity.last_name
        },
        accounts
    };
}
