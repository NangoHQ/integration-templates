import type { NangoSync, User, ProxyConfiguration } from '../../models.js';
import { toUser } from '../mappers/to-user.js';

export default async function fetchData(nango: NangoSync) {
    const config: ProxyConfiguration = {
        // https://developer.grammarly.com/license-management-api.html#get-a-list-of-users
        endpoint: '/users',
        paginate: {
            type: 'cursor',
            cursor_path_in_response: 'paging.next_cursor',
            cursor_name_in_request: 'cursor',
            limit_name_in_request: 'limit',
            response_path: 'data'
        }
    };

    for await (const grammarlyUsers of nango.paginate(config)) {
        const users: User[] = grammarlyUsers.map(toUser);

        if (users.length > 0) {
            await nango.batchSave(users, 'User');
        }
    }
}
