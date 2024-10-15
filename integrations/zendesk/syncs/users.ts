import type { NangoSync, ProxyConfiguration, User } from '../../models';
import type { ZendeskUser } from '../types';
import { getSubdomain } from '../helpers/get-subdomain.js';

export default async function fetchData(nango: NangoSync) {
    const subdomain = await getSubdomain(nango);

    const roles = ['agent', 'admin'];

    const config: ProxyConfiguration = {
        baseUrlOverride: `https://${subdomain}.zendesk.com`,
        // https://developer.zendesk.com/api-reference/ticketing/users/users/#list-users
        endpoint: `/api/v2/users`,
        retries: 10,
        params: {
            roles: roles.join(',')
        },
        paginate: {
            response_path: 'users'
        }
    };

    for await (const zUsers of nango.paginate<ZendeskUser>(config)) {
        const users: User[] = zUsers.map((zUser: ZendeskUser) => {
            const [firstName, lastName] = zUser.name.split(' ');
            return {
                id: zUser.id.toString(),
                firstName: firstName || '',
                lastName: lastName || '',
                email: zUser.email
            };
        });

        await nango.batchSave(users, 'User');
    }
}
