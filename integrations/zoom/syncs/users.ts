import type { NangoSync, ProxyConfiguration, User } from '../../models.js';
import type { ZoomUser } from '../types.js';

export default async function fetchData(nango: NangoSync) {
    const config: ProxyConfiguration = {
        // https://developers.zoom.us/docs/api/rest/reference/user/methods/#operation/users
        endpoint: 'users',
        retries: 10,
        paginate: {
            type: 'cursor',
            cursor_name_in_request: 'next_page_token',
            cursor_path_in_response: 'next_page_token',
            response_path: 'users',
            limit_name_in_request: 'page_size'
        }
    };

    for await (const zUsers of nango.paginate<ZoomUser>(config)) {
        const users: User[] = zUsers.map((zUser: ZoomUser) => {
            return {
                id: zUser.id.toString(),
                firstName: zUser.first_name,
                lastName: zUser.last_name,
                email: zUser.email
            };
        });

        await nango.batchSave(users, 'User');
    }
}
