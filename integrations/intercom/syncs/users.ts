import type { NangoSync, ProxyConfiguration, User } from '../../models';
import { toUser } from '../mappers/to-user.js';
import type { IntercomContact } from '../types';

/**
 * Fetches Intercom user contacts, maps them to Nango User objects,
 * and saves the processed contacts using NangoSync.
 *
 * This function handles pagination and ensures that all contacts are fetched,
 * transformed, and stored.
 *
 * For endpoint documentation, refer to:
 * https://developers.intercom.com/docs/references/rest-api/api.intercom.io/contacts/listcontacts
 *
 * @param nango An instance of NangoSync for synchronization tasks.
 * @returns Promise that resolves when all users are fetched and saved.
 */
export default async function fetchData(nango: NangoSync): Promise<void> {
    let totalRecords = 0;

    const config: ProxyConfiguration = {
        endpoint: '/contacts/search',
        paginate: {
            type: 'cursor',
            cursor_path_in_response: 'pages.next.starting_after',
            limit_name_in_request: 'per_page',
            cursor_name_in_request: 'starting_after',
            response_path: 'data',
            limit: 150
        },
        data: {
            query: {
                operator: 'AND',
                value: [
                    {
                        field: 'role',
                        operator: '=',
                        value: 'user'
                    }
                ]
            }
        },
        method: 'POST',
        retries: 10
    };

    for await (const contacts of nango.paginate<IntercomContact>(config)) {
        const batchSize: number = contacts.length || 0;
        const users = contacts.map(toUser);
        totalRecords += batchSize;

        await nango.log(`Saving batch of ${batchSize} users (total users: ${totalRecords})`);

        await nango.batchSave<User>(users, 'User');
    }
}
