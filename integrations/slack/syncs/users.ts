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

const CheckpointSchema = z.object({
    cursor: z.string()
});

const SlackMemberSchema = z.object({
    id: z.string(),
    team_id: z.string(),
    name: z.string(),
    profile: z
        .object({
            real_name: z.string().nullish(),
            email: z.string().nullish()
        })
        .optional(),
    is_admin: z.boolean().optional(),
    is_owner: z.boolean().optional(),
    is_bot: z.boolean().optional(),
    deleted: z.boolean().optional(),
    updated: z.number().optional()
});

function parseOptional<T>(schema: z.ZodType<T>, value: unknown): T | undefined {
    const result = schema.safeParse(value);
    return result.success ? result.data : undefined;
}

const sync = createSync({
    description: 'Sync all workspace users including deactivated accounts with email and profile fields',
    version: '3.0.1',
    endpoints: [{ method: 'POST', path: '/syncs/users', group: 'Users' }],
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

        const checkpoint = parseOptional(CheckpointSchema, await nango.getCheckpoint());
        const nextCursor = checkpoint?.cursor && checkpoint.cursor.length > 0 ? checkpoint.cursor : undefined;

        await nango.trackDeletesStart('User');

        // https://api.slack.com/methods/users.list
        let currentCursor: string | undefined = nextCursor;

        const proxyConfig = {
            endpoint: 'users.list',
            params: {
                limit: 200,
                ...(currentCursor && { cursor: currentCursor })
            },
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'response_metadata.next_cursor',
                cursor_name_in_request: 'cursor',
                response_path: 'members',
                limit_name_in_request: 'limit',
                limit: 200,
                on_page: async ({ nextPageParam }) => {
                    currentCursor = typeof nextPageParam === 'string' && nextPageParam.length > 0 ? nextPageParam : undefined;
                }
            },
            retries: 3
        } satisfies ProxyConfiguration;

        for await (const batch of nango.paginate(proxyConfig)) {
            const users = batch.map((member: unknown) => {
                const parsed = SlackMemberSchema.parse(member);
                return {
                    id: parsed.id,
                    team_id: parsed.team_id,
                    name: parsed.name,
                    real_name: parsed.profile?.real_name ?? undefined,
                    email: parsed.profile?.email ?? undefined,
                    is_admin: parsed.is_admin ?? false,
                    is_owner: parsed.is_owner ?? false,
                    is_bot: parsed.is_bot ?? false,
                    deleted: parsed.deleted ?? false,
                    updated: parsed.updated ?? 0
                };
            });

            if (users.length > 0) {
                await nango.batchSave(users, 'User');
            }

            if (currentCursor !== undefined) {
                await nango.saveCheckpoint({ cursor: currentCursor });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('User');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
