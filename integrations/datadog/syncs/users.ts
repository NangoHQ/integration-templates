import { createSync } from 'nango';
import type { DatadogUser } from '../types.js';

import type { ProxyConfiguration } from 'nango';
import { User } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Fetches a list of users from Datadog.',
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

    scopes: ['user_access_read'],

    models: {
        User: User
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const config: ProxyConfiguration = {
            // https://docs.datadoghq.com/api/latest/users/#list-all-users
            endpoint: '/v2/users',
            retries: 10,
            params: {
                filter: {
                    // @ts-expect-error param type mismatch
                    status: 'active'
                }
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page[number]',
                offset_calculation_method: 'per-page',
                response_path: 'data',
                limit_name_in_request: 'page[size]'
            }
        };

        for await (const dUsers of nango.paginate<DatadogUser>(config)) {
            const users: User[] = dUsers.map((dUser: DatadogUser) => {
                const [firstName, lastName] = dUser.attributes.name.split(' ');
                const user: User = {
                    id: dUser.id,
                    email: dUser.attributes.email,
                    firstName: firstName || '',
                    lastName: lastName || ''
                };

                return user;
            });

            await nango.batchSave(users, 'User');
        }

        await nango.deleteRecordsFromPreviousExecutions('User');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
