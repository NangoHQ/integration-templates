import { createSync } from 'nango';
import type { DialpadUser } from '../types.js';

import type { ProxyConfiguration } from 'nango';
import { User } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Fetches a list of users from Dialpad',
    version: '2.0.0',
    frequency: 'every day',
    autoStart: true,
    syncType: 'full',

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
        const proxyConfiguration: ProxyConfiguration = {
            // https://developers.dialpad.com/reference/userslist
            endpoint: '/api/v2/users',
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'cursor',
                response_path: 'items',
                limit: 100,
                limit_name_in_request: 'limit'
            },
            params: {
                state: 'active'
            }
        };

        for await (const dialpadUsers of nango.paginate<DialpadUser>(proxyConfiguration)) {
            const users: User[] = dialpadUsers.map((dialpadUser: DialpadUser) => {
                return {
                    id: dialpadUser.id ? dialpadUser.id.toString() : '',
                    firstName: dialpadUser.first_name || '',
                    lastName: dialpadUser.last_name || '',
                    email: dialpadUser.emails && dialpadUser.emails[0] ? dialpadUser.emails[0] : ''
                };
            });

            await nango.batchSave(users, 'User');
        }
    await nango.deleteRecordsFromPreviousExecutions("User");
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
