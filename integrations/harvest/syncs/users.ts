import type { NangoSync, ProxyConfiguration, User } from '../../models';
import { toUser } from '../mappers/to-user.js';
import type { HarvestUser } from '../types';

/**
 * Fetches Harvest users, maps them to Nango User objects,
 * and saves the processed contacts using NangoSync.
 *
 * This function handles pagination and ensures that all contacts are fetched,
 * transformed, and stored.
 *
 * For endpoint documentation, refer to:
 * https://help.getharvest.com/api-v2/users-api/users/users/#list-all-users
 *
 * @param nango An instance of NangoSync for synchronization tasks.
 * @returns Promise that resolves when all users are fetched and saved.
 */
export default async function fetchData(nango: NangoSync): Promise<void> {
    let totalRecords = 0;

    const config: ProxyConfiguration = {
        endpoint: '/v2/users',
        paginate: {
            type: 'cursor',
            cursor_path_in_response: 'next_page',
            limit_name_in_request: 'per_page',
            cursor_name_in_request: 'page',
            response_path: 'users',
            // TODO: update to 2000 after testing
            limit: 1
        },
        retries: 10
    };

    const response = await nango.get(config);
    console.log('response', response);

    for await (const harvestUsers of nango.paginate<HarvestUser>(config)) {
        const batchSize: number = harvestUsers.length || 0;
        const users = harvestUsers.map(toUser);
        totalRecords += batchSize;

        await nango.log(`Saving batch of ${batchSize} users (total users: ${totalRecords})`);

        await nango.batchSave<User>(users, 'User');
    }
}
