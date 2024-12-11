import type { NangoSync, ProxyConfiguration, User } from '../../models';
import type { DialpadUser } from '../types';

export default async function fetchData(nango: NangoSync) {
    const proxyConfiguration: ProxyConfiguration = {
        // https://developers.dialpad.com/reference/userslist
        endpoint: '/api/v2/users',
        paginate: {
            type: 'cursor',
            cursor_name_in_request: 'cursor',
            cursor_path_in_response: 'cursor',
            response_path: 'items',
            limit: 100,
            limit_name_in_request: 'limit'
        },
        params: {
            state: 'active'
        }
    };

    for await (const dialpadUsers of nango.paginate<DialpadUser>(proxyConfiguration)) {
        const users: User[] = dialpadUsers.map((dialpadUser: DialpadUser) => {
            return {
                id: dialpadUser.id ?? null,
                firstName: dialpadUser.first_name ?? null,
                lastName: dialpadUser.last_name ?? null,
                email: dialpadUser.emails ?? null
            };
        });

        await nango.batchSave(users, 'User');
    }
}
