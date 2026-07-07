import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const OktaUserSchema = z.object({
    id: z.string(),
    status: z.string(),
    created: z.string(),
    activated: z.string().nullable().optional(),
    statusChanged: z.string().nullable().optional(),
    lastLogin: z.string().nullable().optional(),
    lastUpdated: z.string(),
    passwordChanged: z.string().nullable().optional(),
    type: z.object({
        id: z.string()
    }),
    profile: z.object({
        firstName: z.string().nullable().optional(),
        lastName: z.string().nullable().optional(),
        mobilePhone: z.string().nullable().optional(),
        secondEmail: z.string().nullable().optional(),
        login: z.string(),
        email: z.string()
    })
});

const UserSchema = z.object({
    id: z.string(),
    status: z.string(),
    created: z.string(),
    activated: z.string().optional(),
    statusChanged: z.string().optional(),
    lastLogin: z.string().optional(),
    lastUpdated: z.string(),
    passwordChanged: z.string().optional(),
    type: z.object({
        id: z.string()
    }),
    profile: z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        mobilePhone: z.string().optional(),
        secondEmail: z.string().optional(),
        login: z.string(),
        email: z.string()
    })
});

type User = z.infer<typeof UserSchema>;

const CheckpointSchema = z.object({
    updated_after: z.string(),
    last_full_refresh: z.string()
});

const FULL_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

const sync = createSync({
    description: 'Sync users.',
    version: '2.0.0',
    frequency: 'every day',
    autoStart: true,
    checkpoint: CheckpointSchema,
    scopes: ['okta.users.read'],
    models: {
        User: UserSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : undefined;
        const runStartedAt = new Date().toISOString();

        const shouldFullRefresh =
            !checkpoint?.last_full_refresh || new Date(runStartedAt).getTime() - new Date(checkpoint.last_full_refresh).getTime() > FULL_REFRESH_INTERVAL_MS;

        const params: Record<string, string | number> = {
            limit: 200
        };

        if (!shouldFullRefresh && checkpoint?.updated_after) {
            params['search'] = `lastUpdated gt "${checkpoint.updated_after}"`;
        }

        if (shouldFullRefresh) {
            await nango.trackDeletesStart('User');
        }

        const config: ProxyConfiguration = {
            // https://developer.okta.com/docs/reference/api/users/#list-users
            endpoint: '/api/v1/users',
            params,
            paginate: {
                type: 'link',
                limit_name_in_request: 'limit',
                link_rel_in_response_header: 'next',
                limit: 200
            },
            retries: 3
        };

        for await (const oktaUsers of nango.paginate(config)) {
            const users: User[] = oktaUsers.map((raw) => {
                const parsed = OktaUserSchema.parse(raw);
                return {
                    id: parsed.id,
                    status: parsed.status,
                    created: parsed.created,
                    ...(parsed.activated != null && { activated: parsed.activated }),
                    ...(parsed.statusChanged != null && { statusChanged: parsed.statusChanged }),
                    ...(parsed.lastLogin != null && { lastLogin: parsed.lastLogin }),
                    lastUpdated: parsed.lastUpdated,
                    ...(parsed.passwordChanged != null && { passwordChanged: parsed.passwordChanged }),
                    type: parsed.type,
                    profile: {
                        ...(parsed.profile.firstName != null && { firstName: parsed.profile.firstName }),
                        ...(parsed.profile.lastName != null && { lastName: parsed.profile.lastName }),
                        ...(parsed.profile.mobilePhone != null && { mobilePhone: parsed.profile.mobilePhone }),
                        ...(parsed.profile.secondEmail != null && { secondEmail: parsed.profile.secondEmail }),
                        login: parsed.profile.login,
                        email: parsed.profile.email
                    }
                };
            });

            if (users.length > 0) {
                await nango.batchSave(users, 'User');
            }
        }

        if (shouldFullRefresh) {
            await nango.trackDeletesEnd('User');
        }

        const nextCheckpoint: z.infer<typeof CheckpointSchema> = {
            updated_after: runStartedAt,
            last_full_refresh: shouldFullRefresh ? runStartedAt : (checkpoint?.last_full_refresh ?? runStartedAt)
        };

        await nango.saveCheckpoint(nextCheckpoint);
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
