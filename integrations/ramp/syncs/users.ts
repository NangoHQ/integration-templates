import { createSync } from 'nango';
import type { RampUserListResponse } from '../types.js';

import type { ProxyConfiguration } from 'nango';
import { User } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Fetches a list of users from Ramp',
    version: '1.0.0',
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

    scopes: ['users:read'],

    models: {
        User: User
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const proxyConfiguration: ProxyConfiguration = {
            // https://docs.ramp.com/developer-api/v1/api/users
            endpoint: '/developer/v1/users',
            paginate: {
                type: 'link',
                link_path_in_response_body: 'page.next',
                response_path: 'data'
            }
        };

        for await (const rampUsers of nango.paginate<RampUserListResponse>(proxyConfiguration)) {
            const users: User[] = rampUsers.map((rampUser: RampUserListResponse) => {
                return {
                    id: rampUser.id?.toString() || '',
                    firstName: rampUser.first_name || '',
                    lastName: rampUser.last_name || '',
                    email: rampUser.email || ''
                };
            });

            await nango.batchSave(users, 'User');
        }
    await nango.deleteRecordsFromPreviousExecutions("User");
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
