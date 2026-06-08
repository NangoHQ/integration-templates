import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderUserSchema = z.object({
    id: z.string(),
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    role: z.string().nullable().optional(),
    email_confirmed_at: z.string().nullable().optional(),
    confirmed_at: z.string().nullable().optional(),
    last_sign_in_at: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional()
});

const UserSchema = z.object({
    id: z.string(),
    email: z.string().optional(),
    phone: z.string().optional(),
    role: z.string().optional(),
    email_confirmed_at: z.string().optional(),
    confirmed_at: z.string().optional(),
    last_sign_in_at: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const ConnectionConfigSchema = z
    .object({
        projectUrl: z.string().optional()
    })
    .passthrough();

const CheckpointSchema = z.object({
    page: z.number().int().positive()
});

const sync = createSync({
    description: 'Sync auth users from Supabase.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        User: UserSchema
    },
    endpoints: [
        {
            path: '/syncs/auth-users',
            method: 'GET'
        }
    ],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const connection = await nango.getConnection();
        const parsedConfig = ConnectionConfigSchema.safeParse(connection.connection_config ?? {});
        const projectUrl = parsedConfig.success ? parsedConfig.data.projectUrl : undefined;
        const baseUrlOverride = typeof projectUrl === 'string' && projectUrl.startsWith('http') ? projectUrl : undefined;
        let nextPage = checkpoint?.page ?? 1;

        const proxyConfig: ProxyConfiguration = {
            // https://supabase.com/docs/reference/api/admin-listusers
            endpoint: '/auth/v1/admin/users',
            baseUrlOverride,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: nextPage,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100,
                response_path: 'users',
                on_page: async ({ nextPageParam }) => {
                    nextPage = typeof nextPageParam === 'number' ? nextPageParam : nextPage + 1;
                }
            },
            retries: 3
        };

        // Blocker: the Auth Admin list API has no changed-since filter or deleted-record feed.
        // Use a page checkpoint only to resume a full refresh safely across interruptions.
        await nango.trackDeletesStart('User');

        for await (const page of nango.paginate(proxyConfig)) {
            const users: Array<z.infer<typeof UserSchema>> = [];
            for (const raw of page) {
                const parsed = ProviderUserSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse user: ${parsed.error.message}`);
                }
                const record = parsed.data;
                users.push({
                    id: record.id,
                    ...(record.email != null && { email: record.email }),
                    ...(record.phone != null && { phone: record.phone }),
                    ...(record.role != null && { role: record.role }),
                    ...(record.email_confirmed_at != null && { email_confirmed_at: record.email_confirmed_at }),
                    ...(record.confirmed_at != null && { confirmed_at: record.confirmed_at }),
                    ...(record.last_sign_in_at != null && { last_sign_in_at: record.last_sign_in_at }),
                    ...(record.created_at != null && { created_at: record.created_at }),
                    ...(record.updated_at != null && { updated_at: record.updated_at })
                });
            }
            if (users.length > 0) {
                await nango.batchSave(users, 'User');
            }

            await nango.saveCheckpoint({ page: nextPage });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('User');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
