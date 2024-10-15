import type { NangoSync, ProxyConfiguration, User } from '../../models';

export default async function fetchData(nango: NangoSync) {
    const config: ProxyConfiguration = {
        // https://developers.zoom.us/docs/api/rest/reference/user/methods/#operation/users
        endpoint: 'users',
        retries: 10,
        paginate: {
            type: 'cursor',
            response_path: 'users'
        }
    };

    for await (const zUsers of nango.paginate(config)) {
        const users: User[] = zUsers.map((zUser: any) => {
            return {
                id: zUser.id.toString(),
                firstName: zUser.firstName,
                lastName: zUser.lastName,
                email: zUser.email
            };
        });

        await nango.batchSave(users, 'User');
    }
}
