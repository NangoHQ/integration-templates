import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';
import { createHash } from 'crypto';

const UserBlockSchema = z.object({
    id: z.string(),
    user_id: z.string(),
    identifier: z.string(),
    ip: z.string().optional(),
    connection: z.string().optional()
});

const CheckpointSchema = z.object({
    page: z.number()
});

const sync = createSync({
    description: 'Sync blocked-IP records for users from Auth0.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        UserBlock: UserBlockSchema
    },
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/user-blocks'
        }
    ],

    exec: async (nango) => {
        await nango.trackDeletesStart('UserBlock');

        const checkpoint = await nango.getCheckpoint();
        let page = checkpoint?.page ?? 0;

        const usersConfig: ProxyConfiguration = {
            // https://auth0.com/docs/api/management/v2/users/get-users
            endpoint: '/api/v2/users',
            params: {
                fields: 'user_id',
                include_fields: 'true'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: page,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 50,
                on_page: async ({ nextPageParam }) => {
                    page = typeof nextPageParam === 'number' ? nextPageParam : 0;
                }
            },
            retries: 3
        };

        for await (const users of nango.paginate(usersConfig)) {
            const userList = z.array(z.object({ user_id: z.string() })).parse(users);
            const blocks: Array<z.infer<typeof UserBlockSchema>> = [];

            for (const user of userList) {
                // https://auth0.com/docs/api/management/v2/user-blocks/get-user-blocks-by-id
                const response = await nango.get({
                    endpoint: `/api/v2/user-blocks/${encodeURIComponent(user.user_id)}`,
                    params: {
                        consider_brute_force_enablement: 'true'
                    },
                    retries: 3
                });

                const data = z
                    .object({
                        blocked_for: z
                            .array(
                                z.object({
                                    identifier: z.string(),
                                    ip: z.string().optional(),
                                    connection: z.string().optional()
                                })
                            )
                            .optional()
                    })
                    .parse(response.data);

                for (const block of data.blocked_for || []) {
                    const id = createHash('sha256')
                        .update(`${user.user_id}:${block.identifier}:${block.ip || ''}`)
                        .digest('hex');

                    blocks.push({
                        id,
                        user_id: user.user_id,
                        identifier: block.identifier,
                        ...(block.ip !== undefined && { ip: block.ip }),
                        ...(block.connection !== undefined && { connection: block.connection })
                    });
                }
            }

            if (blocks.length > 0) {
                await nango.batchSave(blocks, 'UserBlock');
            }

            await nango.saveCheckpoint({ page });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('UserBlock');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
