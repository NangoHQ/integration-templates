import type { NangoSync, ProxyConfiguration, User } from '../../models.js';
import { toUser } from '../mappers/to-user.js';
import type { Perimeter81User } from '../types.js';

/**
 * Fetches Perimeter81 users, maps them to Nango User objects,
 * and saves the processed contacts using NangoSync.
 *
 * This function handles pagination and ensures that all contacts are fetched,
 * transformed, and stored.
 *
 * For endpoint documentation, refer to:
 * https://support.perimeter81.com/docs/get-list-users
 *
 * @param nango An instance of NangoSync for synchronization tasks.
 * @returns Promise that resolves when all users are fetched and saved.
 */
export default async function fetchData(nango: NangoSync): Promise<void> {
    const config: ProxyConfiguration = {
        // https://support.perimeter81.com/docs/get-list-users
        endpoint: '/v1/users',
        paginate: {
            type: 'offset',
            offset_name_in_request: 'page',
            offset_start_value: 1,
            offset_calculation_method: 'per-page',
            limit_name_in_request: 'limit',
            response_path: 'data',
            limit: 100
        },
        retries: 10
    };

    for await (const perimeter81Users of nango.paginate<Perimeter81User>(config)) {
        const users = perimeter81Users.map(toUser);

        await nango.batchSave<User>(users, 'User');
    }
}
