import type { NangoSync, ProxyConfiguration, User } from '../../models.js';
import type { RampUserListResponse } from '../types.js';

export default async function fetchData(nango: NangoSync) {
    const proxyConfiguration: ProxyConfiguration = {
        // https://docs.ramp.com/developer-api/v1/api/users
        endpoint: '/developer/v1/users',
        paginate: {
            type: 'link',
            link_path_in_response_body: 'page.next',
            response_path: 'data'
        }
    };

    for await (const rampUsers of nango.paginate<RampUserListResponse>(proxyConfiguration)) {
        const users: User[] = rampUsers.map((rampUser: RampUserListResponse) => {
            return {
                id: rampUser.id?.toString() || '',
                firstName: rampUser.first_name || '',
                lastName: rampUser.last_name || '',
                email: rampUser.email || ''
            };
        });

        await nango.batchSave(users, 'User');
    }
}
