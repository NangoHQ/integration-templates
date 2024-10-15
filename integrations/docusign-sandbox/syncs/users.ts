import type { NangoSync, ProxyConfiguration, User } from '../../models';
import type { DocuSignUser } from '../types';

// Based on the api: https://developers.docusign.com/docs/esign-rest-api/reference/users/users/list/ Valid values: 1 to 100
const LIMIT = 100;
const PROXY_CONFIGURATION = {
    // TODO: provide account id
    endpoint: '/restapi/v2.1/accounts/b446da56-e1e5-4717-a5be-6a1bd26d7f1d/users',
    paginate: {
        type: 'cursor',
        cursor_path_in_response: 'endPosition',
        limit_name_in_request: 'count',
        cursor_name_in_request: 'startPosition',
        response_path: 'users',
        limit: LIMIT
    }
} as const satisfies ProxyConfiguration;

/**
 * Fetches user data from the DocuSign API and saves it in batches.
 */
export default async function fetchData(nango: NangoSync) {
    let totalRecords = 0;

    for await (const docuSignUsers of nango.paginate(PROXY_CONFIGURATION)) {
        const batchSize: number = docuSignUsers.length || 0;
        totalRecords += batchSize;

        try {
            const users: User[] = docuSignUsers.map(mapUser) || [];

            await nango.log(`Saving batch of ${batchSize} users (total users: ${totalRecords})`);

            await nango.batchSave(users, 'User');
        } catch (error) {
            await nango.log(`Error saving batch of ${batchSize} DocuSing users (total users: ${totalRecords})`);
        }
    }
}

/**
 * Maps a DocuSign object to a User object (Nango User type).
 */
function mapUser(user: DocuSignUser): User {
    return {
        id: user.userId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roleIds: user.permissionProfileName,
        primaryTeamId: '', // TODO: to confirm
        superAdmin: user.isAdmin.toUpperCase() === 'TRUE'
    };
}
