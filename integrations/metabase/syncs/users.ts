import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { User } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Fetches a list of users from Metabase, including active and inactive users.',
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
            // https://www.metabase.com/docs/latest/api/user
            endpoint: '/api/user',
            retries: 10,
            paginate: { response_path: 'data', limit: 100, type: 'offset', offset_name_in_request: 'offset', limit_name_in_request: 'limit' }
        };

        for await (const page of nango.paginate(config)) {
            const validatedUsers = page.map((user) => {
                return {
                    id: user.id.toString(),
                    firstName: user.first_name,
                    lastName: user.last_name,
                    email: user.email
                };
            });
            await nango.batchSave(validatedUsers, 'User');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
