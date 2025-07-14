import type { NangoSync, ProxyConfiguration, GorgiasUser } from '../../models.js';
import type { GorgiasUserResponse } from '../types.js';

/**
 * Fetches data from the Gorgias API and saves it using NangoSync.
 *
 * @param {NangoSync} nango - The NangoSync instance used for fetching and saving data.
 *
 * @returns {Promise<void>} A promise that resolves when the data fetching and saving process is complete.
 *
 * {@link https://developers.gorgias.com/reference/list-users} for more information on the Gorgias API endpoint.
 */
export default async function fetchData(nango: NangoSync) {
    const config: ProxyConfiguration = {
        // https://developers.gorgias.com/reference/list-users
        endpoint: `/api/users`,
        retries: 10,
        paginate: {
            type: 'cursor',
            cursor_path_in_response: 'meta.next_cursor',
            cursor_name_in_request: 'cursor',
            response_path: 'data',
            limit: 30,
            limit_name_in_request: 'limit'
        }
    };

    for await (const zUsers of nango.paginate<GorgiasUserResponse>(config)) {
        const users: GorgiasUser[] = zUsers.map((zUser: GorgiasUserResponse) => {
            return {
                id: zUser.id.toString(),
                firstName: zUser.firstname,
                lastName: zUser.lastname,
                email: zUser.email
            };
        });

        await nango.batchSave(users, 'GorgiasUser');
    }
}
