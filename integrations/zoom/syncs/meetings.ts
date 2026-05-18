import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MeetingSchema = z.object({
    id: z.string(),
    topic: z.string().optional(),
    start_time: z.string().optional(),
    duration: z.number().optional(),
    timezone: z.string().optional(),
    created_at: z.string().optional(),
    join_url: z.string().optional(),
    type: z.number().optional(),
    uuid: z.string().optional(),
    host_id: z.string().optional(),
    status: z.string().optional()
});

const ZoomMeetingItemSchema = z.object({
    id: z.union([z.string(), z.number()]),
    topic: z.string().optional(),
    start_time: z.string().optional(),
    duration: z.number().optional(),
    timezone: z.string().optional(),
    created_at: z.string().optional(),
    join_url: z.string().optional(),
    type: z.number().optional(),
    uuid: z.string().optional(),
    host_id: z.string().optional(),
    status: z.string().optional()
});

const CheckpointSchema = z.object({
    next_page_token: z.string()
});

const sync = createSync({
    description: 'Sync meetings from Zoom.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ method: 'GET', path: '/syncs/meetings' }],
    checkpoint: CheckpointSchema,
    models: {
        Meeting: MeetingSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let nextPageToken = checkpoint?.['next_page_token'] ?? '';

        await nango.trackDeletesStart('Meeting');

        const params: Record<string, string> = {};
        if (nextPageToken) {
            params['next_page_token'] = nextPageToken;
        }

        const proxyConfig: ProxyConfiguration = {
            // https://developers.zoom.us/docs/api/meetings/#tag/Meetings/operation/meetings
            endpoint: '/users/me/meetings',
            params,
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'next_page_token',
                cursor_path_in_response: 'next_page_token',
                response_path: 'meetings',
                limit_name_in_request: 'page_size',
                limit: 300,
                on_page: async ({ nextPageParam }) => {
                    if (typeof nextPageParam === 'string') {
                        nextPageToken = nextPageParam;
                    } else {
                        nextPageToken = '';
                    }
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const items: unknown[] = page;
            const meetings = items
                .map((item) => {
                    const parsed = ZoomMeetingItemSchema.safeParse(item);
                    if (!parsed.success) {
                        return null;
                    }
                    const m = parsed.data;
                    return {
                        id: String(m.id),
                        ...(m.topic !== undefined && { topic: m.topic }),
                        ...(m.start_time !== undefined && { start_time: m.start_time }),
                        ...(m.duration !== undefined && { duration: m.duration }),
                        ...(m.timezone !== undefined && { timezone: m.timezone }),
                        ...(m.created_at !== undefined && { created_at: m.created_at }),
                        ...(m.join_url !== undefined && { join_url: m.join_url }),
                        ...(m.type !== undefined && { type: m.type }),
                        ...(m.uuid !== undefined && { uuid: m.uuid }),
                        ...(m.host_id !== undefined && { host_id: m.host_id }),
                        ...(m.status !== undefined && { status: m.status })
                    };
                })
                .filter((m) => m !== null);

            if (meetings.length > 0) {
                await nango.batchSave(meetings, 'Meeting');
            }

            await nango.saveCheckpoint({
                next_page_token: nextPageToken
            });
        }

        await nango.trackDeletesEnd('Meeting');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
