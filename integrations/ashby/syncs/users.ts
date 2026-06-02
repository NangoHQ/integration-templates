import { createSync } from 'nango';
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
        let syncToken: string | undefined = checkpoint?.sync_token || undefined;
        let cursor: string | undefined = checkpoint?.cursor || undefined;

        while (true) {
            const response = await nango.post<{
                success: boolean;
                results: unknown[];
                moreDataAvailable: boolean;
                nextCursor?: string;
                syncToken?: string;
                errors?: { type?: string; message?: string }[];
            }>({
                // https://developers.ashbyhq.com/reference/userlist
                endpoint: '/user.list',
                data: {
                    limit: 100,
                    includeDeactivated: true,
                    ...(syncToken && { syncToken }),
                    ...(cursor && { cursor })
                },
                retries: 3
            });

            const data = response.data;

            if (!data.success) {
                const isSyncTokenExpired = data.errors?.some((e) => e.type === 'sync_token_expired');
                if (isSyncTokenExpired && syncToken) {
                    syncToken = undefined;
                    cursor = undefined;
                    await nango.saveCheckpoint({ sync_token: '', cursor: '' });
                    continue;
                }
                throw new Error('Ashby API returned a non-success response for user.list');
            }

            const parsedUsers = data.results.map((user) => AshbyUserSchema.parse(user));
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

            cursor = data.nextCursor;

            if (cursor) {
                await nango.saveCheckpoint({ sync_token: syncToken || '', cursor });
            } else {
                if (data.syncToken) {
                    syncToken = data.syncToken;
                }
                await nango.saveCheckpoint({ sync_token: syncToken || '', cursor: '' });
            }

            if (!data.moreDataAvailable) break;
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
