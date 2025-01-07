import type { NangoSync, ProxyConfiguration, User } from '../../models.js';
import type { GongUser } from '../types.js';

export default async function fetchData(nango: NangoSync) {
    const config: ProxyConfiguration = {
        // https://gong.app.gong.io/settings/api/documentation#post-/v2/users/extensive
        endpoint: `/v2/users/extensive`,
        paginate: {
            type: 'cursor',
            cursor_name_in_request: 'cursor',
            cursor_path_in_response: 'cursor',
            response_path: 'users'
        },
        method: 'post',
        retries: 10
    };

    for await (const user of nango.paginate<GongUser>(config)) {
        const users: User[] = user.map((User) => ({
            id: User.id,
            email: User.emailAddress,
            firstName: User.firstName,
            lastName: User.lastName,
            title: User.title,
            phoneNumber: User.phoneNumber
        }));
        await nango.batchSave<User>(users, 'User');
    }
}
