import type { NangoSync, ProxyConfiguration, User } from '../../models';
import { toUser } from '../mappers/to-user.js';
import type { MiroUser } from '../types';

/**
 * Fetches Miro users, maps them to Nango User objects,
 * and saves the processed users using NangoSync.
 *
 * This function handles pagination and ensures that all users are fetched,
 * transformed, and stored.
 *
 * For endpoint documentation, refer to:
 * https://developers.miro.com/docs/users#get-users
 *
 * @param nango An instance of NangoSync for synchronization tasks.
 * @returns Promise that resolves when all users are fetched and saved.
 */
export default async function fetchData(nango: NangoSync): Promise<void> {
    const config: ProxyConfiguration = {
        baseUrlOverride: 'https://miro.com/api',
        endpoint: '/v1/scim/Users',
        paginate: {
            type: 'offset',
            offset_name_in_request: 'startIndex',
            offset_calculation_method: 'per-page',
            response_path: 'Resources',
            limit_name_in_request: 'count',
            limit: 100
        },
        retries: 10
    };

    for await (const miroUsers of nango.paginate<MiroUser>(config)) {
        const users = miroUsers.map(toUser);

        await nango.batchSave<User>(users, 'User');
    }
}
