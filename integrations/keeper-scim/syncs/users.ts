import type { NangoSync, ProxyConfiguration, User } from '../../models';
import { toUser } from '../mappers/to-user.js';
import type { KeeperUser } from '../types';

/**
 * Fetches Keeper users, maps them to Nango User objects,
 * and saves the processed contacts using NangoSync.
 *
 * This function handles pagination and ensures that all contacts are fetched,
 * transformed, and stored.
 *
 * For endpoint documentation, refer to:
 * https://docs.keeper.io/en/enterprise-guide/user-and-team-provisioning/automated-provisioning-with-scim
 *
 * @param nango An instance of NangoSync for synchronization tasks.
 * @returns Promise that resolves when all users are fetched and saved.
 */
export default async function fetchData(nango: NangoSync): Promise<void> {
    const config: ProxyConfiguration = {
        endpoint: '/Users',
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

    for await (const keeperUsers of nango.paginate<KeeperUser>(config)) {
        const users = keeperUsers.map(toUser);

        await nango.batchSave<User>(users, 'User');
    }
}
