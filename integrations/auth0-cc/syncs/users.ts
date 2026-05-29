import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderUserSchema = z.object({
    user_id: z.string(),
    email: z.string().optional(),
    email_verified: z.boolean().optional(),
    username: z.string().optional(),
    phone_number: z.string().optional(),
    phone_verified: z.boolean().optional(),
    created_at: z.string().optional(),
    updated_at: z.string(),
    identities: z.array(z.record(z.string(), z.unknown())).optional(),
    app_metadata: z.record(z.string(), z.unknown()).optional(),
    user_metadata: z.record(z.string(), z.unknown()).optional(),
    picture: z.string().optional(),
    name: z.string().optional(),
    nickname: z.string().optional(),
    multifactor: z.array(z.string()).optional(),
    multifactor_last_modified: z.string().optional(),
    last_ip: z.string().optional(),
    last_login: z.string().optional(),
    last_password_reset: z.string().optional(),
    logins_count: z.number().optional(),
    blocked: z.boolean().optional(),
    given_name: z.string().optional(),
    family_name: z.string().optional()
});

const UserSchema = z.object({
    id: z.string(),
    user_id: z.string().optional(),
    email: z.string().optional(),
    email_verified: z.boolean().optional(),
    username: z.string().optional(),
    phone_number: z.string().optional(),
    phone_verified: z.boolean().optional(),
    created_at: z.string().optional(),
    updated_at: z.string(),
    identities: z.array(z.record(z.string(), z.unknown())).optional(),
    app_metadata: z.record(z.string(), z.unknown()).optional(),
    user_metadata: z.record(z.string(), z.unknown()).optional(),
    picture: z.string().optional(),
    name: z.string().optional(),
    nickname: z.string().optional(),
    last_login: z.string().optional(),
    logins_count: z.number().optional(),
    blocked: z.boolean().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    page: z.number().int().min(0)
});

const sync = createSync({
    description: 'Sync users from Auth0.',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        User: UserSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/users'
        }
    ],

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.safeParse(rawCheckpoint ?? { updated_after: '', page: 0 });
        if (!parsedCheckpoint.success) {
            throw new Error(`Invalid checkpoint: ${parsedCheckpoint.error.message}`);
        }

        let updatedAfter = parsedCheckpoint.data.updated_after || undefined;
        let page: number | undefined = parsedCheckpoint.data.page;
        let lastProcessedUpdatedAt: string | undefined;

        const proxyConfig: ProxyConfiguration = {
            // https://auth0.com/docs/api/management/v2/users/get-users
            endpoint: '/api/v2/users',
            params: {
                sort: 'updated_at:1',
                search_engine: 'v3',
                ...(updatedAfter && { q: `updated_at:{"${updatedAfter}" TO *]` })
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: page ?? 0,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    page = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const batch of nango.paginate(proxyConfig)) {
            const items: unknown[] = batch;
            const users = items.map((item) => {
                const parsed = ProviderUserSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse Auth0 user: ${parsed.error.message}`);
                }
                const user = parsed.data;
                return {
                    id: user.user_id,
                    ...(user.email != null && { email: user.email }),
                    ...(user.email_verified != null && { email_verified: user.email_verified }),
                    ...(user.username != null && { username: user.username }),
                    ...(user.phone_number != null && { phone_number: user.phone_number }),
                    ...(user.phone_verified != null && { phone_verified: user.phone_verified }),
                    ...(user.created_at != null && { created_at: user.created_at }),
                    updated_at: user.updated_at,
                    ...(user.identities != null && { identities: user.identities }),
                    ...(user.app_metadata != null && { app_metadata: user.app_metadata }),
                    ...(user.user_metadata != null && { user_metadata: user.user_metadata }),
                    ...(user.picture != null && { picture: user.picture }),
                    ...(user.name != null && { name: user.name }),
                    ...(user.nickname != null && { nickname: user.nickname }),
                    ...(user.last_login != null && { last_login: user.last_login }),
                    ...(user.logins_count != null && { logins_count: user.logins_count }),
                    ...(user.blocked != null && { blocked: user.blocked })
                };
            });

            if (users.length === 0) {
                if (page === undefined && lastProcessedUpdatedAt) {
                    await nango.saveCheckpoint({
                        updated_after: lastProcessedUpdatedAt,
                        page: 0
                    });
                }
                continue;
            }

            await nango.batchSave(users, 'User');

            const lastUser = users[users.length - 1];
            if (!lastUser) {
                continue;
            }
            lastProcessedUpdatedAt = lastUser.updated_at;

            if (page !== undefined) {
                await nango.saveCheckpoint({
                    updated_after: updatedAfter || '',
                    page
                });
                continue;
            }

            updatedAfter = lastProcessedUpdatedAt;
            await nango.saveCheckpoint({
                updated_after: updatedAfter,
                page: 0
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
