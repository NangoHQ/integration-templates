import type { NangoSync, ProxyConfiguration, User } from '../../models.js';
import type { DiscourseUser } from '../types.js';
import { toUser } from '../mappers/toUser.js';

/**
 * Fetches user data from an API and saves it in batch.
 *
 * This function uses the `paginate` helper to fetch active users from the specified API endpoint in a paginated manner.
 * It maps the raw user data to a `User` format using the `toUser` mapper function and then saves the mapped data
 * using the `nango.batchSave` method.
 * For detailed endpoint documentation, refer to:
 * https://docs.discourse.org/#tag/Admin/operation/adminListUsers
 *
 * @param nango The NangoSync instance used for making API calls and saving data.
 * @returns A promise that resolves when the data has been successfully fetched and saved.
 */
export default async function fetchData(nango: NangoSync): Promise<void> {
    const config: ProxyConfiguration = {
        // https://docs.discourse.org/#tag/Users/operation/adminListUsers
        endpoint: '/admin/users/list/active',
        params: {
            order: 'created',
            asc: 'true',
            stats: 'true'
        },
        paginate: {
            type: 'offset',
            offset_name_in_request: 'page',
            offset_calculation_method: 'per-page',
            response_path: ''
        }
    };

    for await (const users of nango.paginate<DiscourseUser>(config)) {
        await nango.batchSave<User>(users.map(toUser), 'User');
    }
}
