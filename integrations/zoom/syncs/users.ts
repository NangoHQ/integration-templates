import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ZoomUserSchema = z.object({
    id: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().optional(),
    type: z.number().optional(),
    pmi: z.number().optional(),
    timezone: z.string().optional(),
    dept: z.string().optional(),
    created_at: z.string().optional(),
    last_login_time: z.string().optional(),
    last_client_version: z.string().optional(),
    group_ids: z.array(z.string()).optional(),
    im_group_ids: z.array(z.string()).optional(),
    status: z.string().optional(),
    role_id: z.string().optional()
});

const UserSchema = z.object({
    id: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().optional(),
    type: z.number().optional(),
    pmi: z.number().optional(),
    timezone: z.string().optional(),
    dept: z.string().optional(),
    created_at: z.string().optional(),
    last_login_time: z.string().optional(),
    last_client_version: z.string().optional(),
    group_ids: z.array(z.string()).optional(),
    im_group_ids: z.array(z.string()).optional(),
    status: z.string().optional(),
    role_id: z.string().optional()
});

const CheckpointSchema = z.object({
    next_page_token: z.string()
});

const sync = createSync({
    description: 'Sync users from Zoom.',
    version: '2.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    endpoints: [
        {
            path: '/syncs/users',
            method: 'GET'
        }
    ],
    models: {
        User: UserSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let nextPageToken = checkpoint?.['next_page_token'] ?? '';

        // Zoom only exposes a short-lived pagination cursor here, so this remains
        // a full refresh with delete tracking plus resume support for interrupted runs.
        await nango.trackDeletesStart('User');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.zoom.us/docs/api/rest/reference/zoom-api/methods/#operation/users
            endpoint: '/users',
            params: {
                page_size: 300,
                ...(nextPageToken && { next_page_token: nextPageToken })
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'next_page_token',
                cursor_path_in_response: 'next_page_token',
                response_path: 'users',
                limit_name_in_request: 'page_size',
                limit: 300,
                on_page: async ({ nextPageParam }) => {
                    nextPageToken = typeof nextPageParam === 'string' ? nextPageParam : '';
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const validatedUsers = z.array(ZoomUserSchema).safeParse(page);
            if (!validatedUsers.success) {
                continue;
            }

            const users = validatedUsers.data.map((record) => ({
                id: record.id,
                ...(record.first_name != null && { first_name: record.first_name }),
                ...(record.last_name != null && { last_name: record.last_name }),
                ...(record.email != null && { email: record.email }),
                ...(record.type != null && { type: record.type }),
                ...(record.pmi != null && { pmi: record.pmi }),
                ...(record.timezone != null && { timezone: record.timezone }),
                ...(record.dept != null && { dept: record.dept }),
                ...(record.created_at != null && { created_at: record.created_at }),
                ...(record.last_login_time != null && { last_login_time: record.last_login_time }),
                ...(record.last_client_version != null && { last_client_version: record.last_client_version }),
                ...(record.group_ids != null && { group_ids: record.group_ids }),
                ...(record.im_group_ids != null && { im_group_ids: record.im_group_ids }),
                ...(record.status != null && { status: record.status }),
                ...(record.role_id != null && { role_id: record.role_id })
            }));

            if (users.length > 0) {
                await nango.batchSave(users, 'User');
            }

            await nango.saveCheckpoint({ next_page_token: nextPageToken });
        }

        await nango.trackDeletesEnd('User');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
