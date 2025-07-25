import type { NangoSync, ProxyConfiguration, User } from '../../models.js';
import { toUser } from '../mappers/to-user.js';
import type { IntercomAdminUser } from '../types.js';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const config: ProxyConfiguration = {
        // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/admins/listadmins
        endpoint: '/admins',
        paginate: {
            type: 'cursor',
            cursor_path_in_response: 'pages.next.starting_after',
            limit_name_in_request: 'per_page',
            cursor_name_in_request: 'starting_after',
            response_path: 'admins'
        },
        retries: 10
    };

    for await (const iUsers of nango.paginate<IntercomAdminUser>(config)) {
        const users = iUsers.map(toUser);

        await nango.batchSave<User>(users, 'User');
    }
}
