import type { NangoAction, ProxyConfiguration } from '../../models';
import { OktaListUsersResponse, OktaUser } from '../types';

export default async function runAction(nango: NangoAction): Promise<OktaListUsersResponse> {
    const config: ProxyConfiguration = {
        // https://developer.okta.com/docs/api/openapi/okta-management/management/tag/User/#tag/User/operation/listUsers
        endpoint: `/api/v1/users`,
        retries: 10
    };
    const response = await nango.get(config);

    const userOutput = response.data.map((user: OktaUser)  => {
        return {
            id: user.id,
            status: user.status,
            created: user.created,
            activated: user.activated,
            statusChanged: user.statusChanged,
            lastLogin: user.lastLogin,
            lastUpdated: user.lastUpdated,
            passwordChanged: user.passwordChanged,
            type: user.type,
            profile: user.profile
        }
    })

    return { users: userOutput };
}