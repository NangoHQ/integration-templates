import type { NangoSync, ProxyConfiguration, User } from '../../models';
import type { AircallUser } from '../types';

export default async function fetchData(nango: NangoSync) {
    const config: ProxyConfiguration = {
        // https://developer.aircall.io/api-references/#list-all-users
        endpoint: '/v1/users',
        retries: 10,
        paginate: {
            response_path: 'users'
        }
    };

    for await (const aUsers of nango.paginate<AircallUser>(config)) {
        const users: User[] = aUsers.map((aUser: AircallUser) => {
            const [firstName, lastName] = aUser.name.split(' ');
            const user: User = {
                id: aUser.id.toString(),
                firstName: firstName || '',
                lastName: lastName || '',
                email: aUser.email
            };

            return user;
        });

        await nango.batchSave(users, 'User');
    }
}
