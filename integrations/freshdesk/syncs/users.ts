import type { NangoSync, ProxyConfiguration, User } from '../../models.js';
import type { FreshdeskAgent } from '../types.js';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const proxyConfiguration: ProxyConfiguration = {
        // https://developer.freshdesk.com/api/#list_all_agents
        endpoint: '/api/v2/agents',
        retries: 10,
        paginate: {
            type: 'link',
            limit_name_in_request: 'per_page',
            link_rel_in_response_header: 'next',
            limit: 100
        }
    };

    for await (const freshdeskUsers of nango.paginate<FreshdeskAgent>(proxyConfiguration)) {
        const users: User[] = freshdeskUsers.map(mapUser) || [];

        await nango.batchSave(users, 'User');
    }
}

/**
 * Maps a Freshdesk user object to a Nango User object.
 */

function mapUser(user: FreshdeskAgent): User {
    const [firstName = '', lastName = ''] = (user?.contact?.name ?? '').split(' ');

    return {
        id: user.id.toString(),
        email: user.contact.email,
        firstName,
        lastName
    };
}
