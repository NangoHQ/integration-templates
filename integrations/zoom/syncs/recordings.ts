import { createSync } from 'nango';
import { z } from 'zod';

const RecordingSchema = z.object({
    id: z.string(),
    uuid: z.string(),
    account_id: z.string().optional(),
    host_id: z.string().optional(),
    topic: z.string().optional(),
    type: z.number().optional(),
    start_time: z.string().optional(),
    duration: z.number().optional(),
    total_size: z.number().optional(),
    recording_count: z.number().optional(),
    share_url: z.string().optional()
});

const CheckpointSchema = z.object({
    from: z.string(),
    to: z.string(),
    next_page_token: z.string()
});

const ProviderRecordingSchema = z.object({
    uuid: z.string(),
    id: z.union([z.string(), z.number()]).optional(),
    account_id: z.string().optional(),
    host_id: z.string().optional(),
    topic: z.string().optional(),
    type: z.number().optional(),
    start_time: z.string().optional(),
    duration: z.number().optional(),
    total_size: z.number().optional(),
    recording_count: z.number().optional(),
    share_url: z.string().optional()
});

const sync = createSync({
    description: 'Sync recordings from Zoom.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Recording: RecordingSchema
    },
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/recordings'
        }
    ],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let from = checkpoint?.['from'] || '';
        let to = checkpoint?.['to'] || '';
        let nextPageToken = checkpoint?.['next_page_token'] || '';

        let lastStartTime: string | undefined;

        const params: Record<string, string | number> = {
            page_size: 300
        };
        if (from) {
            params['from'] = from;
        }
        if (to) {
            params['to'] = to;
        }
        if (nextPageToken) {
            params['next_page_token'] = nextPageToken;
        }

        for await (const page of nango.paginate({
            // https://developers.zoom.us/docs/api/rest/reference/zoom-api/methods/#operation/recordingsList
            endpoint: '/users/me/recordings',
            params,
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'next_page_token',
                cursor_path_in_response: 'next_page_token',
                response_path: 'meetings',
                limit_name_in_request: 'page_size',
                limit: 300,
                on_page: async ({ nextPageParam, response }) => {
                    nextPageToken = typeof nextPageParam === 'string' ? nextPageParam : '';
                    const data = response.data;
                    if (typeof data === 'object' && data !== null) {
                        if ('from' in data && typeof data['from'] === 'string') {
                            from = data['from'];
                        }
                        if ('to' in data && typeof data['to'] === 'string') {
                            to = data['to'];
                        }
                    }
                }
            },
            retries: 3
        })) {
            const items = Array.isArray(page) ? page : [];
            const recordings: {
                id: string;
                uuid: string;
                account_id?: string;
                host_id?: string;
                topic?: string;
                type?: number;
                start_time?: string;
                duration?: number;
                total_size?: number;
                recording_count?: number;
                share_url?: string;
            }[] = [];
            let pageMaxStartTime: string | undefined;

            for (const item of items) {
                const parsed = ProviderRecordingSchema.safeParse(item);
                if (!parsed.success) {
                    continue;
                }
                const meeting = parsed.data;

                recordings.push({
                    id: String(meeting.uuid),
                    uuid: meeting.uuid,
                    ...(meeting.account_id != null && { account_id: meeting.account_id }),
                    ...(meeting.host_id != null && { host_id: meeting.host_id }),
                    ...(meeting.topic != null && { topic: meeting.topic }),
                    ...(meeting.type != null && { type: meeting.type }),
                    ...(meeting.start_time != null && { start_time: meeting.start_time }),
                    ...(meeting.duration != null && { duration: meeting.duration }),
                    ...(meeting.total_size != null && { total_size: meeting.total_size }),
                    ...(meeting.recording_count != null && { recording_count: meeting.recording_count }),
                    ...(meeting.share_url != null && { share_url: meeting.share_url })
                });

                if (meeting.start_time && (pageMaxStartTime === undefined || meeting.start_time > pageMaxStartTime)) {
                    pageMaxStartTime = meeting.start_time;
                }
            }

            if (recordings.length > 0) {
                await nango.batchSave(recordings, 'Recording');
            }

            if (pageMaxStartTime && (lastStartTime === undefined || pageMaxStartTime > lastStartTime)) {
                lastStartTime = pageMaxStartTime;
            }

            if (nextPageToken) {
                await nango.saveCheckpoint({
                    from,
                    to,
                    next_page_token: nextPageToken
                });
            }
        }

        const nextFrom = lastStartTime ? lastStartTime.slice(0, 10) : to;
        if (nextFrom) {
            await nango.saveCheckpoint({
                from: nextFrom,
                to: '',
                next_page_token: ''
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
