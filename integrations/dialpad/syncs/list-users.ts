import type { NangoSync } from '@nangohq/nango';
import type { User } from '../types';

/**
 * Fetches user data from the Dialpad API and saves it in batches.
 * Dialpad API pagination: https://developers.dialpad.com/reference/pagination
 */
export default async function fetchData(nango: NangoSync) {
    let totalRecords = 0;

    const proxyConfiguration = {
        endpoint: '/users',
        paginate: {
            type: 'cursor',
            cursor_name_in_request: 'cursor',
            cursor_name_in_response: 'next_cursor',
            response_path: 'items',
            limit: 100 // TODO: confirm Dialpad's default limit 
        }
    };

    for await (const dialpadUsers of nango.paginate(proxyConfiguration)) {
        const batchSize = dialpadUsers.length || 0;
        totalRecords += batchSize;

        const users: User[] = dialpadUsers.map(mapUser);

        await nango.log(`Saving batch of ${batchSize} users (total users: ${totalRecords})`);
        await nango.batchSave(users, 'User');
    }
}

/**
 * Maps a Dialpad user object to our standardized User type
 */
function mapUser(user: any): User {
    return {
        id: user.id,
        email: user.email,
        firstName: user.first_name || user.firstName, //TODO: verify the keys of the response
        lastName: user.last_name || user.lastName
    };
} 