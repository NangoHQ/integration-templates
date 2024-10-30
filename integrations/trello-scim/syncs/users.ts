import type { NangoSync, ProxyConfiguration, User } from '../../models';
import { toUser } from '../mappers/to-user.js';
import type { TrelloUser } from '../types';

/**
 * Fetches Trello SCIM API users, maps them to Nango User objects,
 * and saves the processed contacts using NangoSync.
 *
 * This function handles pagination and ensures that all contacts are fetched,
 * transformed, and stored.
 *
 * For endpoint documentation, refer to:
 * https://developer.atlassian.com/cloud/trello/scim/routes/#list-and-search
 *
 * @param nango An instance of NangoSync for synchronization tasks.
 * @returns Promise that resolves when all users are fetched and saved.
 */
export default async function fetchData(nango: NangoSync): Promise<void> {
    const config: ProxyConfiguration = {
        // https://developer.atlassian.com/cloud/trello/scim/routes/#list-and-search
        endpoint: '/scim/v2/Users',
        paginate: {
            type: 'offset',
            offset_name_in_request: 'startIndex', // startIndex is 1-based
            offset_start_value: 1,
            offset_calculation_method: 'per-page',
            limit_name_in_request: 'count',
            response_path: 'Resources',
            limit: 100
        },
        retries: 10
    };

    for await (const trelloUsers of nango.paginate<TrelloUser>(config)) {
        const users = trelloUsers.map(toUser);

        await nango.batchSave<User>(users, 'User');
    }
}
