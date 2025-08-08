import { createSync } from 'nango';
import { toUser } from '../mappers/toUser.js';
import type { OktaUser } from '../types.js';

import type { ProxyConfiguration } from 'nango';
import { User } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Fetches lists users in your org',
    version: '1.0.0',
    frequency: 'every day',
    autoStart: true,
    syncType: 'incremental',
    trackDeletes: false,

    endpoints: [
        {
            method: 'GET',
            path: '/users',
            group: 'Users'
        }
    ],

    scopes: ['okta.users.read'],

    models: {
        User: User
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const filters = [];
        if (nango.lastSyncDate) {
            filters.push(`lastUpdated gt "${nango.lastSyncDate.toISOString()}"`);
        }

        const config: ProxyConfiguration = {
            // https://developer.okta.com/docs/api/openapi/okta-management/management/tag/User/#tag/User/operation/listUsers
            endpoint: `/api/v1/users`,
            retries: 10,
            params: {
                filter: filters.join(',')
            },
            paginate: {
                type: 'link',
                limit_name_in_request: 'limit',
                link_rel_in_response_header: 'next',
                limit: 100
            }
        };

        for await (const oktaUsers of nango.paginate<OktaUser>(config)) {
            const users: User[] = oktaUsers.map((user: OktaUser) => {
                return toUser(user);
            });
            await nango.batchSave(users, 'User');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
