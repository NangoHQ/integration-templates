import type { NangoSync, User, ProxyConfiguration } from '../../models';

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
        const users: User[] = grammarlyUsers.map((user) => {
            const nameParts = user.name.split(' ');
            const [firstName, ...rest] = nameParts;
            const lastName = rest.length > 0 ? rest.join(' ') : '';

            return {
                id: user.user_id,
                firstName,
                lastName,
                email: user.email,
                __raw: user
            };
        });

        if (users.length > 0) {
            await nango.batchSave(users, 'User');
        }
    }
}
