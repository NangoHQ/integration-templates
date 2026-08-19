import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { User } from '../models.js';
import { z } from 'zod';

const FreshdeskAgentSchema = z.object({
    id: z.number(),
    contact: z.object({
        name: z.string().nullable().optional(),
        email: z.string()
    })
});

const CheckpointSchema = z.object({
    page: z.number().int().positive()
});

const sync = createSync({
    description: 'Fetches the list of users',
    version: '2.1.0',
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
    checkpoint: CheckpointSchema,

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : undefined;

        await nango.trackDeletesStart('User');

        let page = checkpoint?.page ?? 1;

        const proxyConfiguration: ProxyConfiguration = {
            // https://developer.freshdesk.com/api/#list_all_agents
            endpoint: '/api/v2/agents',
            retries: 10,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: page,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100
            }
        };

        for await (const freshdeskUsers of nango.paginate(proxyConfiguration)) {
            const users: User[] =
                freshdeskUsers.map((raw) => {
                    const user = FreshdeskAgentSchema.parse(raw);
                    return mapUser(user);
                }) || [];

            await nango.batchSave(users, 'User');

            page++;
            await nango.saveCheckpoint({ page });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('User');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

/**
 * Maps a Freshdesk user object to a Nango User object.
 */
function mapUser(user: z.infer<typeof FreshdeskAgentSchema>): User {
    const [firstName = '', lastName = ''] = (user?.contact?.name ?? '').split(' ');

    return {
        id: user.id.toString(),
        email: user.contact.email,
        firstName,
        lastName
    };
}
