import { createSync } from 'nango';
import type { NotionUser } from '../types.js';

import type { ProxyConfiguration } from 'nango';
import { User } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Fetches a list of users from Notion',
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
            // https://developers.notion.com/reference/get-users
            endpoint: '/v1/users',
            retries: 10
        };

        for await (const rawUsers of nango.paginate<NotionUser>(config)) {
            const users: User[] = rawUsers.map((rawUser: NotionUser) => {
                const [firstName, lastName] = rawUser.name.split(' ');
                return {
                    id: rawUser.id,
                    firstName: firstName ?? '',
                    lastName: lastName ?? '',
                    email: rawUser.person ? rawUser.person.email : '',
                    isBot: rawUser.bot !== undefined
                };
            });

            await nango.batchSave(users, 'User');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
