import { createSync } from 'nango';
import { toUser } from '../mappers/toUser.js';
import type { OktaUser } from '../types.js';

import type { ProxyConfiguration } from 'nango';
import { User } from '../models.js';
import { z } from 'zod';

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const sync = createSync({
    description: 'Fetches lists users in your org',
    version: '1.0.0',
    frequency: 'every day',
    autoStart: true,
    checkpoint: CheckpointSchema,

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
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : undefined;
        const checkpointUpdatedAfter = checkpoint?.updated_after ? new Date(checkpoint.updated_after) : undefined;
        const runStartedAt = new Date().toISOString();

        const filters = [];
        if (checkpointUpdatedAfter) {
            filters.push(`lastUpdated gt "${checkpointUpdatedAfter.toISOString()}"`);
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
        await nango.saveCheckpoint({ updated_after: runStartedAt });

    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
