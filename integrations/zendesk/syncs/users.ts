import { createSync } from 'nango';
import type { ZendeskUser } from '../types.js';
import { getSubdomain } from '../helpers/get-subdomain.js';

import type { ProxyConfiguration } from 'nango';
import { User } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Fetches a list of admin or agent users from Zendesk',
    version: '2.0.0',
    frequency: 'every 6 hours',
    autoStart: true,
    syncType: 'full',

    endpoints: [
        {
            method: 'GET',
            path: '/users'
        }
    ],

    scopes: ['users:read'],

    models: {
        User: User
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const subdomain = await getSubdomain(nango);

        const roles = ['agent', 'admin'];

        const config: ProxyConfiguration = {
            baseUrlOverride: `https://${subdomain}.zendesk.com`,
            // https://developer.zendesk.com/api-reference/ticketing/users/users/#list-users
            endpoint: `/api/v2/users`,
            retries: 10,
            params: {
                roles: roles.join(',')
            },
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'meta.after_cursor',
                limit_name_in_request: 'page[size]',
                cursor_name_in_request: 'page[after]',
                limit: 100,
                response_path: 'users'
            }
        };

        for await (const zUsers of nango.paginate<ZendeskUser>(config)) {
            const users: User[] = zUsers.map((zUser: ZendeskUser) => {
                const [firstName, lastName] = zUser.name.split(' ');
                return {
                    id: zUser.id.toString(),
                    firstName: firstName || '',
                    lastName: lastName || '',
                    email: zUser.email,
                    user_fields: zUser.user_fields
                };
            });

            await nango.batchSave(users, 'User');
        }
        await nango.deleteRecordsFromPreviousExecutions('User');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
