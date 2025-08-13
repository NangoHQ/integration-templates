import { createSync } from 'nango';
import type { GorgiasUserResponse } from '../types.js';

import type { ProxyConfiguration } from 'nango';
import { GorgiasUser } from '../models.js';
import { z } from 'zod';

/**
 * Fetches data from the Gorgias API and saves it using NangoSync.
 *
 * @param {NangoSync} nango - The NangoSync instance used for fetching and saving data.
 *
 * @returns {Promise<void>} A promise that resolves when the data fetching and saving process is complete.
 *
 * {@link https://developers.gorgias.com/reference/list-users} for more information on the Gorgias API endpoint.
 */
const sync = createSync({
    description: 'Fetches the list of users',
    version: '1.0.0',
    frequency: 'every 6 hours',
    autoStart: true,
    syncType: 'full',
    trackDeletes: true,

    endpoints: [
        {
            method: 'GET',
            path: '/users',
            group: 'Users'
        }
    ],

    scopes: ['users:read'],

    models: {
        GorgiasUser: GorgiasUser
    },

    metadata: z.object({}),

    exec: async (nango) => {
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
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
