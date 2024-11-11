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
    const config: ProxyConfiguration = {
        // https://help.getharvest.com/api-v2/users-api/users/users/#list-all-users
        endpoint: '/v2/users',
        paginate: {
            type: 'link',
            response_path: 'users',
            link_path_in_response_body: 'links.next'
        },
        retries: 10
    };

    const params: Record<string, string> = {
        is_active: 'true'
    };

    if (nango.lastSyncDate) {
        params['updated_since'] = nango.lastSyncDate.toISOString();
    }

    config.params = params;

    for await (const harvestUsers of nango.paginate<HarvestUser>(config)) {
        const users = harvestUsers.map(toUser);

        await nango.batchSave<User>(users, 'User');
    }
}
