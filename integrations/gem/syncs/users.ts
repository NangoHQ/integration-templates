import { createSync } from 'nango';
import type { GemTeamUser } from '../types.js';
import { toUser } from '../mappers/to-user.js';

import type { ProxyConfiguration } from 'nango';
import { TeamMemberUser } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Get a list of all users from Gem',
    version: '1.0.0',
    frequency: 'every 1h',
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
        TeamMemberUser: TeamMemberUser
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const proxyConfig: ProxyConfiguration = {
            // https://api.gem.com/v0/reference#tag/Users/paths/~1v0~1users/get
            endpoint: '/v0/users',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                limit_name_in_request: 'per_page',
                limit: 100
            },
            retries: 10
        };

        for await (const users of nango.paginate<GemTeamUser>(proxyConfig)) {
            const mappedUsers = users.map(toUser);
            await nango.batchSave(mappedUsers, 'TeamMemberUser');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
