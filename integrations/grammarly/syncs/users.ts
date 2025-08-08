import { createSync } from 'nango';
import { toUser } from '../mappers/to-user.js';

import type { ProxyConfiguration } from 'nango';
import { User } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Fetches a list of users from Grammarly',
    version: '1.0.0',
    frequency: 'every day',
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

    models: {
        User: User
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const config: ProxyConfiguration = {
            // https://developer.grammarly.com/license-management-api.html#get-a-list-of-users
            endpoint: '/users',
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'paging.next_cursor',
                cursor_name_in_request: 'cursor',
                limit_name_in_request: 'limit',
                response_path: 'data'
            }
        };

        for await (const grammarlyUsers of nango.paginate(config)) {
            const users: User[] = grammarlyUsers.map(toUser);

            if (users.length > 0) {
                await nango.batchSave(users, 'User');
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
