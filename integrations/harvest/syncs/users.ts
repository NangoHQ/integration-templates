import { createSync } from 'nango';
import { toUser } from '../mappers/to-user.js';
import type { HarvestUser } from '../types.js';

import type { ProxyConfiguration } from 'nango';
import { User } from '../models.js';
import { z } from 'zod';

/**
 * Fetches Harvest users, maps them to Nango User objects,
 * and saves the processed contacts using NangoSync.
 *
 * This function handles pagination and ensures that all contacts are fetched,
 * transformed, and stored.
 *
 * For endpoint documentation, refer to:
 * https://help.getharvest.com/api-v2/users-api/users/users/#list-all-users
 *
 * @param nango An instance of NangoSync for synchronization tasks.
 * @returns Promise that resolves when all users are fetched and saved.
 */
const CheckpointSchema = z.object({
    updated_after: z.string()
});

const sync = createSync({
    description: 'Fetches the list of users in Harvest',
    version: '1.1.0',
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

    scopes: ['administrator', 'manager'],

    models: {
        User: User
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : undefined;
        const checkpointUpdatedAfter = checkpoint?.updated_after ? new Date(checkpoint.updated_after) : undefined;
        const runStartedAt = new Date().toISOString();

        const config: ProxyConfiguration = {
            // https://help.getharvest.com/api-v2/users-api/users/users/#list-all-users
            endpoint: '/v2/users',
            paginate: {
                type: 'link',
                response_path: 'users',
                link_path_in_response_body: 'links.next'
            },
            retries: 10
        };

        const params: Record<string, string> = {
            is_active: 'true'
        };

        if (checkpointUpdatedAfter) {
            params['updated_since'] = checkpointUpdatedAfter.toISOString();
        }

        config.params = params;

        for await (const harvestUsers of nango.paginate<HarvestUser>(config)) {
            const users = harvestUsers.map(toUser);

            await nango.batchSave(users, 'User');
        }
        await nango.saveCheckpoint({ updated_after: runStartedAt });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
