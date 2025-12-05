import { createSync } from 'nango';
import type { DiscourseUser } from '../types.js';
import { toUser } from '../mappers/toUser.js';

import type { ProxyConfiguration } from 'nango';
import { User } from '../models.js';
import { z } from 'zod';

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
const sync = createSync({
    description: 'Fetches a list of active users from Discourse.',
    version: '2.0.0',
    frequency: 'every 1 hour',
    autoStart: true,
    syncType: 'full',

    endpoints: [
        {
            method: 'GET',
            path: '/users'
        }
    ],

    models: {
        User: User
    },

    metadata: z.object({}),

    exec: async (nango) => {
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
            await nango.batchSave(users.map(toUser), 'User');
        }

        await nango.deleteRecordsFromPreviousExecutions('User');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
