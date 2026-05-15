import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Provider schema based on Pipedrive API response
// https://developers.pipedrive.com/docs/api/v1/Users#getUsers
const PipedriveUserSchema = z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
    phone: z.string().nullable().optional(),
    locale: z.string().optional(),
    timezone_name: z.string().optional(),
    timezone_offset: z.string().optional(),
    created: z.string().optional(),
    modified: z.string().optional(),
    last_login: z.string().nullable().optional(),
    role_id: z.number().nullable().optional(),
    is_admin: z.number().optional(),
    active_flag: z.boolean().optional()
});

// Normalized model schema
const UserSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    phone: z.string().optional(),
    locale: z.string().optional(),
    timezone_name: z.string().optional(),
    timezone_offset: z.string().optional(),
    created: z.string().optional(),
    modified: z.string().optional(),
    last_login: z.string().optional(),
    role_id: z.number().optional(),
    is_admin: z.number().optional(),
    active_flag: z.boolean().optional()
});

const sync = createSync({
    description: 'Sync users from Pipedrive.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        User: UserSchema
    },
    // https://developers.pipedrive.com/docs/api/v1/Users#getUsers
    endpoints: [
        {
            path: '/syncs/users',
            method: 'GET'
        }
    ],

    exec: async (nango) => {
        // Blocker: Pipedrive Users API does not support timestamp-based filtering
        // or change tracking. It only provides offset/limit pagination without
        // any incremental sync capabilities.
        await nango.trackDeletesStart('User');

        // https://developers.pipedrive.com/docs/api/v1/Users#getUsers
        const proxyConfig: ProxyConfiguration = {
            // https://developers.pipedrive.com/docs/api/v1/Users#getUsers
            endpoint: '/v1/users',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'start',
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'limit',
                limit: 100,
                response_path: 'data'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const providerUsers = z.array(PipedriveUserSchema).safeParse(page);

            if (!providerUsers.success) {
                await nango.log({
                    type: 'warn',
                    message: `Failed to parse users page: ${providerUsers.error.message}`
                });
                continue;
            }

            const users = providerUsers.data.map((user) => ({
                id: String(user.id),
                name: user.name,
                email: user.email,
                ...(user.phone && { phone: user.phone }),
                ...(user.locale && { locale: user.locale }),
                ...(user.timezone_name && { timezone_name: user.timezone_name }),
                ...(user.timezone_offset && { timezone_offset: user.timezone_offset }),
                ...(user.created && { created: user.created }),
                ...(user.modified && { modified: user.modified }),
                ...(user.last_login && { last_login: user.last_login }),
                ...(user.role_id !== null && user.role_id !== undefined && { role_id: user.role_id }),
                ...(user.is_admin !== undefined && { is_admin: user.is_admin }),
                ...(user.active_flag !== undefined && { active_flag: user.active_flag })
            }));

            if (users.length > 0) {
                await nango.batchSave(users, 'User');
            }
        }

        await nango.trackDeletesEnd('User');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
