import { createSync } from 'nango';
import type { GongUser, AxiosError, GongError } from '../types.js';

import type { ProxyConfiguration } from 'nango';
import { User } from '../models.js';
import { z } from 'zod';

const BATCH_SIZE = 100;

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const sync = createSync({
    description: 'Fetches the list of gong users',
    version: '2.1.0',
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

    scopes: ['api:users:read'],

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
            // https://gong.app.gong.io/settings/api/documentation#post-/v2/users/extensive
            endpoint: `/v2/users/extensive`,
            data: {
                filter: {
                    ...(checkpointUpdatedAfter && {
                        createdFromDateTime: checkpointUpdatedAfter.toISOString()
                    })
                }
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'records.cursor',
                in_body: true,
                response_path: 'users'
            },
            method: 'post',
            retries: 10
        };

        // @allowTryCatch
        try {
            for await (const usersBatch of nango.paginate<GongUser>(config)) {
                // Process users in batches
                for (let i = 0; i < usersBatch.length; i += BATCH_SIZE) {
                    const currentBatch = usersBatch.slice(i, i + BATCH_SIZE);
                    await nango.log(`Processing batch of ${currentBatch.length} calls...`);
                    const mappedUsers: User[] = currentBatch.map((user) => ({
                        id: String(user.id),
                        email: user.emailAddress,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        title: user.title
                    }));

                    if (mappedUsers.length > 0) {
                        await nango.batchSave(mappedUsers, 'User');
                    }
                }
            }
        } catch (error: any) {
            // eslint-disable-next-line @nangohq/custom-integrations-linting/no-object-casting
            const errors = (error as AxiosError<GongError>).response?.data?.errors ?? [];
            const emptyResult = errors.includes('No users found corresponding to the provided filters');

            if (emptyResult) {
                await nango.log('No users found corresponding to the provided filters');
            } else {
                throw error;
            }
        }
        await nango.saveCheckpoint({ updated_after: runStartedAt });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
