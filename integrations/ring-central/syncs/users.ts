import type { NangoSync, ProxyConfiguration, User } from '../../models';
import { toUser } from '../mappers/to-user.js';
import type { RingCentralUser } from '../types';

/**
 * Fetches RingCentral users, maps them to Nango User objects,
 * and saves the processed contacts using NangoSync.
 *
 * This function handles pagination and ensures that all contacts are fetched,
 * transformed, and stored.
 *
 * For endpoint documentation, refer to:
 * https://developers.ringcentral.com/api-reference/SCIM/scimSearchViaPost2
 *
 * @param nango An instance of NangoSync for synchronization tasks.
 * @returns Promise that resolves when all users are fetched and saved.
 */
export default async function fetchData(nango: NangoSync): Promise<void> {
    const config: ProxyConfiguration = {
        // https://developers.ringcentral.com/api-reference/SCIM/scimSearchViaPost2
        endpoint: '/scim/v2/Users/.search',
        paginate: {
            type: 'offset',
            offset_name_in_request: 'startIndex', // startIndex is 1-based
            offset_start_value: 1,
            offset_calculation_method: 'per-page',
            limit_name_in_request: 'count',
            response_path: 'Resources',
            limit: 100
        },
        data: {
            schemas: ['urn:ietf:params:scim:api:messages:2.0:SearchRequest']
        },
        method: 'POST',
        retries: 10
    };

    for await (const ringCentralUser of nango.paginate<RingCentralUser>(config)) {
        const users = ringCentralUser.map(toUser);

        await nango.batchSave<User>(users, 'User');
    }
}
