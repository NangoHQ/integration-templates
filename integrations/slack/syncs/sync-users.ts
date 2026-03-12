import { createSync } from 'nango';
import { z } from 'zod';

const UserSchema = z.object({
    id: z.string(),
    team_id: z.string(),
    name: z.string(),
    real_name: z.union([z.string(), z.null()]),
    email: z.union([z.string(), z.null()]),
    is_admin: z.boolean(),
    is_owner: z.boolean(),
    is_bot: z.boolean(),
    deleted: z.boolean(),
    updated: z.number()
});

const CheckpointSchema = z.object({
    cursor: z.string(),
    delete_tracking_started: z.boolean()
});

type Checkpoint = z.infer<typeof CheckpointSchema>;

const sync = createSync({
    description: 'Sync all workspace users including deactivated accounts with email and profile fields',
    version: '1.0.0',
    endpoints: [{ method: 'POST', path: '/syncs/sync-users', group: 'Users' }],
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,

    models: {
        User: UserSchema
    },

    exec: async (nango) => {
        // Full refresh strategy required because Slack's users.list API:
        // - Does not support updated_at/modified_since filters
        // - Does not provide a changed-records endpoint
        // - Does not support webhooks for user changes
        // The API only returns a complete list of all users

        const checkpoint = (await nango.getCheckpoint()) as Checkpoint | null;
        let cursor = checkpoint?.cursor || undefined;

        if (!checkpoint?.delete_tracking_started) {
            await nango.trackDeletesStart('User');
            await nango.saveCheckpoint({
                cursor: cursor ?? '',
                delete_tracking_started: true
            });
        }

        while (true) {
            const response = await nango.get<{
                members?: Array<{
                    id: string;
                    team_id: string;
                    name: string;
                    profile?: {
                        real_name?: string;
                        email?: string;
                    };
                    is_admin?: boolean;
                    is_owner?: boolean;
                    is_bot?: boolean;
                    deleted?: boolean;
                    updated?: number;
                }>;
                response_metadata?: { next_cursor?: string };
            }>({
                // https://api.slack.com/methods/users.list
                endpoint: 'users.list',
                params: {
                    limit: 200,
                    ...(cursor && { cursor })
                },
                retries: 3
            });

            const users = (response.data.members ?? []).map((member) => ({
                id: member.id,
                team_id: member.team_id,
                name: member.name,
                real_name: member.profile?.real_name ?? null,
                email: member.profile?.email ?? null,
                is_admin: member.is_admin ?? false,
                is_owner: member.is_owner ?? false,
                is_bot: member.is_bot ?? false,
                deleted: member.deleted ?? false,
                updated: member.updated ?? 0
            }));

            if (users.length > 0) {
                await nango.batchSave(users, 'User');
            }

            const nextCursor = response.data.response_metadata?.next_cursor;
            if (nextCursor) {
                cursor = nextCursor;
                await nango.saveCheckpoint({
                    cursor,
                    delete_tracking_started: true
                });
                continue;
            }

            break;
        }

        await nango.trackDeletesEnd('User');
        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
