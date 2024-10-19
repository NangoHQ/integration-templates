import type { NangoSync, ProxyConfiguration, User } from '../../models';
import type { FreshdeskUser } from '../types';

/**
 * Fetches user data from Freshdesk and saves it in batches.
 *
 * Retrieves contacts from the Freshdesk API using pagination. It accumulates the total number of records fetched
 * and logs the progress for each batch of users saved. The function continues to fetch data until all records have been retrieved.
 *
 * List all contacts Freshdesk API docs: https://developer.freshdesk.com/api/#list_all_contacts
 *
 */
// https://developer.freshdesk.com/api/#contacts
export default async function fetchData(nango: NangoSync): Promise<void> {
    let totalRecords = 0;

    const proxyConfiguration: ProxyConfiguration = {
        endpoint: '/api/v2/contacts',
        retries: 10,
        paginate: {
            type: 'link',
            limit_name_in_request: 'per_page',
            link_rel_in_response_header: 'next',
            limit: 100
        }
    };

    for await (const freshdeskUsers of nango.paginate(proxyConfiguration)) {
        const batchSize: number = freshdeskUsers.length || 0;
        totalRecords += batchSize;

        const users: User[] = freshdeskUsers.map(mapUser) || [];

        await nango.log(`Saving batch of ${batchSize} users (total users: ${totalRecords})`);

        await nango.batchSave(users, 'User');
    }
}

/**
 * Maps a Freshdesk user object to a Nango User object.
 */

function mapUser(user: FreshdeskUser): User {
    const [firstName = '', lastName = ''] = (user?.name ?? '').split(' ');

    return {
        id: user.id.toString(),
        email: user.email,
        firstName,
        lastName
    };
}
