import type { NangoSync, ProxyConfiguration, User } from '../../models';
import type { BoxUser } from '../types';

const LIMIT = 100;
const PROXY_CONFIGURATION = {
    // Box API has two pagination options:
    // 1. offset (default)
    // 2. marker (next_marker and prev_marker)
    // Opting to use the marker
    endpoint: '/2.0/users?useMarker=true',
    paginate: {
        type: 'cursor',
        cursor_path_in_response: 'next_marker',
        limit_name_in_request: 'limit',
        cursor_name_in_request: 'marker',
        response_path: 'entries',
        limit: LIMIT
    }
} as const satisfies ProxyConfiguration;

/**
 * Fetches user data from the Box API and saves it in batches.
 */
export default async function fetchData(nango: NangoSync) {
    let totalRecords = 0;

    for await (const boxUsers of nango.paginate(PROXY_CONFIGURATION)) {
        const batchSize: number = boxUsers.length || 0;
        totalRecords += batchSize;

        try {
            const users: User[] = boxUsers.map(mapUser) || [];

            await nango.log(`Saving batch of ${batchSize} users (total users: ${totalRecords})`);

            await nango.batchSave(users, 'User');
        } catch (error) {
            await nango.log(`Error saving batch of ${batchSize} Box users (total users: ${totalRecords})`);
        }
    }
}

/**
 * Maps a BoxUser object to a User object (Nango User type).
 */
function mapUser(user: BoxUser): User {
    return {
        id: user.id,
        email: user.login,
        firstName: user.name,
        lastName: '',
        roleIds: [user.role],
        primaryTeamId: user.enterprise.id,
        superAdmin: user.role === 'admin'
    };
}
