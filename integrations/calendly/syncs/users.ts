import type { NangoSync, ProxyConfiguration, User } from '../../models';
import { getOrganizationId } from '../helpers/get-organizationId.js';
import type { CalendlyOrganizationMember } from '../types';

// Based on the api: https://developer.calendly.com/api-docs/eaed2e61a6bc3-list-organization-memberships
// Valid values: 1 to 100
const LIMIT = 100;

/**
 * Fetches user data from the Calendly API and saves it in batches.
 */
export default async function fetchData(nango: NangoSync) {
    let totalRecords = 0;
    const organization = await getOrganizationId(nango);
    const proxyConfiguration: ProxyConfiguration = {
        endpoint: `/organization_memberships?organization=${organization.uri}`,
        paginate: {
            type: 'cursor',
            cursor_path_in_response: 'pagination.next_page',
            limit_name_in_request: 'count',
            cursor_name_in_request: 'page_token',
            response_path: 'collection',
            limit: LIMIT
        }
    };

    for await (const orgMemberships of nango.paginate(proxyConfiguration)) {
        const batchSize: number = orgMemberships.length || 0;
        totalRecords += batchSize;

        const users: User[] = orgMemberships.map(mapUser) || [];

        await nango.log(`Saving batch of ${batchSize} users (total users: ${totalRecords})`);

        await nango.batchSave(users, 'User');
    }
}

/**
 * Maps a CalendlyOrganizationMember object to a User object (Nango User type).
 */
function mapUser(orgMember: CalendlyOrganizationMember): User {
    const { name, uri, email } = orgMember.user;
    // the id, .i.e., AAAAAAAAAAAAAAAA can be extracted from the
    // uri https://api.calendly.com/users/AAAAAAAAAAAAAAAA
    const id = uri.split('/').pop() ?? '';
    const [firstName = '', lastName = ''] = name.split(' ');

    return {
        id,
        email,
        firstName,
        lastName
    };
}
