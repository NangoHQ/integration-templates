import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const UserSchema = z.object({
    id: z.string(),
    team_id: z.string(),
    name: z.string(),
    real_name: z.string().optional(),
    email: z.string().optional(),
    is_admin: z.boolean(),
    is_owner: z.boolean(),
    is_bot: z.boolean(),
    deleted: z.boolean(),
    updated: z.number()
});

const sync = createSync({
    description: 'Sync all workspace users including deactivated accounts with email and profile fields',
    version: '3.0.0',
    endpoints: [{ method: 'POST', path: '/syncs/users', group: 'Users' }],
    frequency: 'every hour',
    autoStart: true,

    models: {
        User: UserSchema
    },

    exec: async (nango) => {
        // Full refresh strategy required because Slack's users.list API:
        // - Does not support updated_at/modified_since filters
        // - Does not provide a changed-records endpoint
        // - Does not support webhooks for user changes
        // The API only returns a complete list of all users

        await nango.trackDeletesStart('User');

        // https://api.slack.com/methods/users.list
        const proxyConfig = {
            endpoint: 'users.list',
            params: {
                limit: 200
            },
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'response_metadata.next_cursor',
                cursor_name_in_request: 'cursor',
                response_path: 'members',
                limit_name_in_request: 'limit',
                limit: 200
            },
            retries: 3
        } satisfies ProxyConfiguration;

        for await (const batch of nango.paginate(proxyConfig)) {
            const users = batch.map(
                (member: {
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
                }) => ({
                    id: member.id,
                    team_id: member.team_id,
                    name: member.name,
                    real_name: member.profile?.real_name ?? undefined,
                    email: member.profile?.email ?? undefined,
                    is_admin: member.is_admin ?? false,
                    is_owner: member.is_owner ?? false,
                    is_bot: member.is_bot ?? false,
                    deleted: member.deleted ?? false,
                    updated: member.updated ?? 0
                })
            );

            if (users.length > 0) {
                await nango.batchSave(users, 'User');
            }
        }

        await nango.trackDeletesEnd('User');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
