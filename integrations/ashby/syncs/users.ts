import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const AshbyUserSchema = z.object({
    id: z.string(),
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    globalRole: z.string().nullable().optional(),
    isEnabled: z.boolean().optional(),
    updatedAt: z.string().nullable().optional()
});

const UserSchema = z.object({
    id: z.string(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    globalRole: z.string().optional(),
    isEnabled: z.boolean().optional(),
    updatedAt: z.string().optional()
});

const CheckpointSchema = z.object({
    sync_token: z.string(),
    cursor: z.string()
});

const sync = createSync({
    description: 'Sync users from Ashby',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    // https://developers.ashbyhq.com/reference/userlist
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/users'
        }
    ],
    models: {
        User: UserSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const currentSyncToken = checkpoint?.sync_token || undefined;
        const currentCursor = checkpoint?.cursor || undefined;

        let nextCursor: string | undefined;
        let nextSyncToken: string | undefined;

        const proxyConfig: ProxyConfiguration = {
            // https://developers.ashbyhq.com/reference/userlist
            endpoint: '/user.list',
            method: 'POST',
            data: {
                limit: 100,
                includeDeactivated: true,
                ...(currentSyncToken && { syncToken: currentSyncToken }),
                ...(currentCursor && { cursor: currentCursor })
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'nextCursor',
                response_path: 'results',
                limit_name_in_request: 'limit',
                limit: 100,
                on_page: async ({ nextPageParam, response }) => {
                    const envelope = z
                        .object({
                            success: z.boolean(),
                            moreDataAvailable: z.boolean(),
                            nextCursor: z.string().nullable().optional(),
                            syncToken: z.string().optional()
                        })
                        .parse(response.data);

                    nextCursor = typeof nextPageParam === 'string' ? nextPageParam : undefined;

                    if (!envelope.moreDataAvailable && envelope.syncToken) {
                        nextSyncToken = envelope.syncToken;
                    }
                }
            },
            retries: 3
        };

        for await (const users of nango.paginate(proxyConfig)) {
            const parsedUsers = users.map((user) => AshbyUserSchema.parse(user));
            const mappedUsers = parsedUsers.map((user) => ({
                id: user.id,
                ...(user.firstName != null && { firstName: user.firstName }),
                ...(user.lastName != null && { lastName: user.lastName }),
                ...(user.email != null && { email: user.email }),
                ...(user.globalRole != null && { globalRole: user.globalRole }),
                ...(user.isEnabled !== undefined && { isEnabled: user.isEnabled }),
                ...(user.updatedAt != null && { updatedAt: user.updatedAt })
            }));

            if (mappedUsers.length > 0) {
                await nango.batchSave(mappedUsers, 'User');
            }

            if (nextCursor) {
                await nango.saveCheckpoint({
                    sync_token: currentSyncToken || '',
                    cursor: nextCursor
                });
            } else if (nextSyncToken) {
                await nango.saveCheckpoint({
                    sync_token: nextSyncToken,
                    cursor: ''
                });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
