import type { NangoSync, User, ProxyConfiguration } from '../../models.js';
import type { NotionUser } from '../types.js';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const config: ProxyConfiguration = {
        // https://developers.notion.com/reference/get-users
        endpoint: '/v1/users',
        retries: 10
    };

    for await (const rawUsers of nango.paginate<NotionUser>(config)) {
        const users: User[] = rawUsers.map((rawUser: NotionUser) => {
            const [firstName, lastName] = rawUser.name.split(' ');
            return {
                id: rawUser.id,
                firstName: firstName ?? '',
                lastName: lastName ?? '',
                email: rawUser.person ? rawUser.person.email : '',
                isBot: rawUser.bot !== undefined
            };
        });

        await nango.batchSave<User>(users, 'User');
    }
}
