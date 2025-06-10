import type { NangoSync, ProxyConfiguration, User } from '../../models.js';
import type { GongUser } from '../types.js';

export default async function fetchData(nango: NangoSync) {
    const config: ProxyConfiguration = {
        // https://gong.app.gong.io/settings/api/documentation#post-/v2/users/extensive
        endpoint: `/v2/users/extensive`,
        data: {
            filter: {
                ...(nango.lastSyncDate && {
                    createdFromDateTime: nango.lastSyncDate.toISOString()
                })
            }
        },
        paginate: {
            type: 'cursor',
            cursor_name_in_request: 'cursor',
            cursor_path_in_response: 'records.cursor',
            in_body: true,
            response_path: 'users'
        },
        method: 'post',
        retries: 10
    };

    for await (const user of nango.paginate<GongUser>(config)) {
        const users: User[] = user.map((User) => ({
            id: String(User.id),
            email: User.emailAddress,
            firstName: User.firstName,
            lastName: User.lastName
        }));
        await nango.batchSave<User>(users, 'User');
    }
}
