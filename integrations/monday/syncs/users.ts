import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const UserSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    email: z.string().optional(),
    created_at: z.string().optional(),
    url: z.string().optional(),
    photo_thumb: z.string().optional(),
    title: z.string().optional(),
    location: z.string().optional(),
    phone: z.string().optional(),
    mobile_phone: z.string().optional(),
    time_zone_identifier: z.string().optional(),
    utc_hours_diff: z.number().optional()
});

const ProviderUserSchema = z.object({
    id: z.union([z.string(), z.number()]),
    name: z.string(),
    email: z.string(),
    created_at: z.string().nullable(),
    url: z.string(),
    photo_thumb: z.string().nullable(),
    title: z.string().nullable(),
    location: z.string().nullable(),
    phone: z.string().nullable(),
    mobile_phone: z.string().nullable(),
    time_zone_identifier: z.string().nullable(),
    utc_hours_diff: z.number().nullable()
});

const sync = createSync({
    description: 'Sync users from monday.com.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        User: UserSchema
    },
    // https://developer.monday.com/api-reference/reference/users
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/users'
        }
    ],

    exec: async (nango) => {
        // Blocker: the monday.com users query does not support updated_since
        // filters, cursors, or any resumable change-tracking. It only offers
        // limit/page offset pagination with no incremental filtering, so a full
        // refresh is required.
        await nango.trackDeletesStart('User');

        const proxyConfig: ProxyConfiguration = {
            // https://developer.monday.com/api-reference/reference/users
            endpoint: '/v2',
            method: 'POST',
            headers: {
                'api-version': '2026-04'
            },
            data: {
                query: 'query ($limit: Int, $page: Int) { users(limit: $limit, page: $page) { id name email created_at url photo_thumb title location phone mobile_phone time_zone_identifier utc_hours_diff } }',
                variables: {}
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'variables.page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'variables.limit',
                limit: 100,
                response_path: 'data.users'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            if (!Array.isArray(page)) {
                throw new Error('Expected users page to be an array');
            }

            const users = page.map((user) => {
                const parsed = ProviderUserSchema.parse(user);
                return {
                    id: String(parsed.id),
                    name: parsed.name,
                    email: parsed.email,
                    ...(parsed.created_at != null && { created_at: parsed.created_at }),
                    url: parsed.url,
                    ...(parsed.photo_thumb != null && { photo_thumb: parsed.photo_thumb }),
                    ...(parsed.title != null && { title: parsed.title }),
                    ...(parsed.location != null && { location: parsed.location }),
                    ...(parsed.phone != null && { phone: parsed.phone }),
                    ...(parsed.mobile_phone != null && { mobile_phone: parsed.mobile_phone }),
                    ...(parsed.time_zone_identifier != null && { time_zone_identifier: parsed.time_zone_identifier }),
                    ...(parsed.utc_hours_diff != null && { utc_hours_diff: parsed.utc_hours_diff })
                };
            });

            if (users.length > 0) {
                await nango.batchSave(users, 'User');
            }
        }

        await nango.trackDeletesEnd('User');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
