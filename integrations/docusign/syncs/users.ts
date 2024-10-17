import type { NangoSync, ProxyConfiguration, User } from '../../models';
import { getRequestInfo } from '../helpers/get-requestInfo';
import type { DocuSignUser } from '../types';

// Based on the api: https://developers.docusign.com/docs/esign-rest-api/reference/users/users/list/ Valid values: 1 to 100
const LIMIT = 100;

/**
 * Fetches user data from the DocuSign API and saves it in batches.
 */
export default async function fetchData(nango: NangoSync) {
    let totalRecords = 0;
    const { baseUri, accountId } = await getRequestInfo(nango);

    const proxyConfiguration: ProxyConfiguration = {
        baseUrlOverride: baseUri,
        endpoint: `/restapi/v2.1/accounts/${accountId}/users`,
        paginate: {
            type: 'offset',
            offset_name_in_request: 'start_position',
            limit_name_in_request: 'count',
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
