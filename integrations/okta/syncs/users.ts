import type { NangoSync, ProxyConfiguration, User } from '../../models.js';
import { toUser } from '../mappers/toUser.js';
import type { OktaUser } from '../types.js';

export default async function fetchData(nango: NangoSync) {
    const filters = [];
    if (nango.lastSyncDate) {
        filters.push(`lastUpdated gt "${nango.lastSyncDate.toISOString()}"`);
    }

    const config: ProxyConfiguration = {
        // https://developer.okta.com/docs/api/openapi/okta-management/management/tag/User/#tag/User/operation/listUsers
        endpoint: `/api/v1/users`,
        retries: 10,
        params: {
            filter: filters.join(',')
        },
        paginate: {
            type: 'link',
            limit_name_in_request: 'limit',
            link_rel_in_response_header: 'next',
            limit: 100
        }
    };

    for await (const oktaUsers of nango.paginate<OktaUser>(config)) {
        const users: User[] = oktaUsers.map((user: OktaUser) => {
            return toUser(user);
        });
        await nango.batchSave<User>(users, 'User');
    }
}
