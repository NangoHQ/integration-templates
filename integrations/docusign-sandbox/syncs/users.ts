import type { NangoSync, ProxyConfiguration, GetDocuSignUsersInput, User } from '../../models';
import type { DocuSignUser } from '../types';

// Based on the api: https://developers.docusign.com/docs/esign-rest-api/reference/users/users/list/ Valid values: 1 to 100
const LIMIT = 100;

/**
 * Fetches user data from the DocuSign API and saves it in batches.
 */
export default async function fetchData(nango: NangoSync) {
    const { accountId } = await nango.getMetadata<GetDocuSignUsersInput>();

    let totalRecords = 0;

    const proxyConfiguration: ProxyConfiguration = {
        endpoint: `/restapi/v2.1/accounts/${accountId}/users`,
        paginate: {
            type: 'cursor',
            cursor_path_in_response: 'endPosition',
            limit_name_in_request: 'count',
            cursor_name_in_request: 'start_position',
            response_path: 'users',
            limit: LIMIT
        }
    };

    for await (const docuSignUsers of nango.paginate(proxyConfiguration)) {
        const batchSize: number = docuSignUsers.length || 0;
        totalRecords += batchSize;

        const users: User[] = docuSignUsers.map(mapUser) || [];

        await nango.log(`Saving batch of ${batchSize} users (total users: ${totalRecords})`);

        await nango.batchSave(users, 'User');
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
        lastName: user.lastName
    };
}

// TODO: generate helper function to fetch account and baseUrl and update use `baseUrlOverride`
// TODO: users sync clean up
// TODO: add mock data with --save-responses
// TODO: copy and paste logic from docusign-sandbox to docusign
