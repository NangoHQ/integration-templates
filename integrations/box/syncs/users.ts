import type { NangoSync, ProxyConfiguration, User } from '../../models';
import type { BoxUser } from '../types';

/**
 * Fetches user data from the Box API and saves it in batches.
 */
export default async function fetchData(nango: NangoSync) {
    let totalRecords = 0;

    const config: ProxyConfiguration = {
        // https://developer.box.com/reference/get-users/
        endpoint: '/2.0/users',
        params: {
            // Box API has two pagination options:
            // 1. offset (default)
            // 2. marker (next_marker and prev_marker)
            userMarker: 'true'
        },
        paginate: {
            type: 'cursor',
            cursor_path_in_response: 'next_marker',
            limit_name_in_request: 'limit',
            cursor_name_in_request: 'marker',
            response_path: 'entries',
            limit: 100
        }
    };

    for await (const boxUsers of nango.paginate(config)) {
        const batchSize: number = boxUsers.length || 0;
        totalRecords += batchSize;

        const users: User[] = boxUsers.map(mapUser) || [];

        await nango.log(`Saving batch of ${batchSize} users (total users: ${totalRecords})`);

        await nango.batchSave(users, 'User');
    }
}

/**
 * Maps a BoxUser object to a User object (Nango User type).
 */
function mapUser(user: BoxUser): User {
    const [firstName, lastName] = user.name.split(' ');

    return {
        id: user.id,
        email: user.login,
        firstName: firstName || '',
        lastName: lastName || ''
    };
}
