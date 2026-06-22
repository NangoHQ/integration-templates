import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const AircallUserSchema = z.object({
    id: z.number(),
    direct_link: z.string(),
    name: z.string(),
    email: z.string(),
    available: z.boolean(),
    availability_status: z.string(),
    created_at: z.string(),
    time_zone: z.string(),
    language: z.string(),
    substatus: z.string().optional(),
    wrap_up_time: z.number().optional(),
    extension: z.string().optional(),
    default_number_id: z.number().nullable().optional()
});

const UserSchema = z.object({
    id: z.string(),
    direct_link: z.string().optional(),
    name: z.string().optional(),
    email: z.string().optional(),
    available: z.boolean().optional(),
    availability_status: z.string().optional(),
    created_at: z.string().optional(),
    time_zone: z.string().optional(),
    language: z.string().optional(),
    substatus: z.string().optional(),
    wrap_up_time: z.number().optional(),
    extension: z.string().optional(),
    default_number_id: z.number().optional()
});

const sync = createSync({
    description: 'Sync users from Aircall.',
    version: '3.0.0',
    endpoints: [{ method: 'POST', path: '/syncs/users' }],
    frequency: 'every hour',
    autoStart: true,
    syncType: 'full',
    models: {
        User: UserSchema
    },

    exec: async (nango) => {
        await nango.trackDeletesStart('User');

        const proxyConfig: ProxyConfiguration = {
            // https://developer.aircall.io/api-references/#list-all-users-v2
            endpoint: '/v2/users',
            paginate: {
                type: 'link',
                link_path_in_response_body: 'meta.next_page_link',
                limit_name_in_request: 'per_page',
                limit: 50,
                response_path: 'users'
            },
            retries: 3
        };

        for await (const batch of nango.paginate(proxyConfig)) {
            const rawUsers = z.array(AircallUserSchema).parse(batch);
            const users = rawUsers.map((user) => ({
                id: String(user.id),
                direct_link: user.direct_link,
                name: user.name,
                email: user.email,
                available: user.available,
                availability_status: user.availability_status,
                created_at: user.created_at,
                time_zone: user.time_zone,
                language: user.language,
                substatus: user.substatus,
                wrap_up_time: user.wrap_up_time,
                extension: user.extension,
                ...(user.default_number_id != null && { default_number_id: user.default_number_id })
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
