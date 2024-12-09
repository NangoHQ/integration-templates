import type { NangoSync, ProxyConfiguration } from '../models';
import type { DialpadUser, User } from '../types';

/**
 * Fetches user data from the Dialpad API and saves it in batches.
*/
export default async function fetchData(nango: NangoSync) {
    let totalRecords = 0;
    
    const proxyConfiguration: ProxyConfiguration = {
 
        // https://developers.dialpad.com/reference/userslist
        endpoint: '/users',
        paginate: {
            type: 'cursor',
            cursor_name_in_request: 'cursor',
            cursor_path_in_response: 'next_cursor',
            response_path: 'users',
            limit: 100
        }
    };

    for await (const dialpadUsers of nango.paginate(proxyConfiguration)) {
        const users: User[] = dialpadUsers.map(mapUser) || [];

        await nango.batchSave(users, 'User');
    }
}

/**
 * Maps a DialpadUser object to a User object (Nango User type).
 */
function mapUser(dialpadUser: DialpadUser): User {
    return {
        id: dialpadUser.id,
        email: dialpadUser.email,
        firstName: dialpadUser.first_name,
        lastName: dialpadUser.last_name
    };
}

