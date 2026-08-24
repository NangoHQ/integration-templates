import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderWebinarSchema = z.object({
    id: z.number(),
    uuid: z.string().optional(),
    host_id: z.string().optional(),
    topic: z.string().optional(),
    agenda: z.string().optional(),
    type: z.number().int().optional(),
    duration: z.number().optional(),
    start_time: z.string().optional(),
    timezone: z.string().optional(),
    created_at: z.string().optional(),
    join_url: z.string().optional()
});

const WebinarSchema = z.object({
    id: z.string(),
    uuid: z.string().optional(),
    host_id: z.string().optional(),
    topic: z.string().optional(),
    agenda: z.string().optional(),
    type: z.number().int().optional(),
    duration: z.number().optional(),
    start_time: z.string().optional(),
    timezone: z.string().optional(),
    created_at: z.string().optional(),
    join_url: z.string().optional()
});

const CheckpointSchema = z.object({
    next_page_token: z.string()
});

const sync = createSync({
    description: 'Sync webinars from Zoom.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Webinar: WebinarSchema
    },
    endpoints: [
        // https://developers.zoom.us/docs/api/rest/reference/zoom-api/methods/#operation/webinars
        {
            method: 'GET',
            path: '/syncs/webinars'
        }
    ],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let nextPageToken = checkpoint?.['next_page_token'] ?? '';

        await nango.trackDeletesStart('Webinar');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.zoom.us/docs/api/rest/reference/zoom-api/methods/#operation/webinars
            endpoint: '/users/me/webinars',
            params: {
                page_size: 300,
                ...(nextPageToken && { next_page_token: nextPageToken })
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'next_page_token',
                cursor_path_in_response: 'next_page_token',
                response_path: 'webinars',
                limit_name_in_request: 'page_size',
                limit: 300,
                on_page: async ({ nextPageParam }) => {
                    nextPageToken = typeof nextPageParam === 'string' ? nextPageParam : '';
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            if (!Array.isArray(page)) {
                throw new Error('Invalid webinars page: expected array');
            }

            const records = page.map((item) => {
                const webinar = ProviderWebinarSchema.parse(item);
                return {
                    id: String(webinar.id),
                    ...(webinar.uuid != null && { uuid: webinar.uuid }),
                    ...(webinar.host_id != null && { host_id: webinar.host_id }),
                    ...(webinar.topic != null && { topic: webinar.topic }),
                    ...(webinar.agenda != null && { agenda: webinar.agenda }),
                    ...(webinar.type != null && { type: webinar.type }),
                    ...(webinar.duration != null && { duration: webinar.duration }),
                    ...(webinar.start_time != null && { start_time: webinar.start_time }),
                    ...(webinar.timezone != null && { timezone: webinar.timezone }),
                    ...(webinar.created_at != null && { created_at: webinar.created_at }),
                    ...(webinar.join_url != null && { join_url: webinar.join_url })
                };
            });

            if (records.length > 0) {
                await nango.batchSave(records, 'Webinar');
            }

            if (nextPageToken) {
                await nango.saveCheckpoint({ next_page_token: nextPageToken });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Webinar');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
