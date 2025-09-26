import { createSync } from 'nango';
import type { RecruiterFlowUserResponse } from '../types.js';

import type { ProxyConfiguration } from 'nango';
import { RecruiterFlowUser } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Syncs all users from RecruiterFlow',
    version: '2.0.0',
    frequency: 'every hour',
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
        RecruiterFlowUser: RecruiterFlowUser
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const proxyConfig: ProxyConfiguration = {
            // https://recruiterflow.com/api#/User%20APIs/get_api_external_user_list
            endpoint: '/api/external/user/list',
            retries: 10
        };

        const response = await nango.get<{ data: RecruiterFlowUserResponse[] }>(proxyConfig);
        const users = response.data.data;

        await nango.batchSave(users.map(toUser), 'RecruiterFlowUser');
    await nango.deleteRecordsFromPreviousExecutions("RecruiterFlowUser");
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

function toUser(record: RecruiterFlowUserResponse): RecruiterFlowUser {
    return {
        id: record.id.toString(),
        email: record.email,
        first_name: record.first_name,
        last_name: record.last_name,
        role: record.role?.map((role) => role.name),
        img_link: record.img_link ?? null
    };
}
