import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const PersonSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    distinct_ids: z.array(z.string()).optional(),
    properties: z.unknown().nullable().optional(),
    created_at: z.string().optional(),
    uuid: z.string().optional(),
    last_seen_at: z.string().nullable().optional()
});

const SummaryOutcomeSchema = z.object({
    description: z.string().optional(),
    success: z.boolean().optional()
});

const SessionRecordingSchema = z.object({
    id: z.string(),
    distinct_id: z.string().optional(),
    viewed: z.boolean().optional(),
    viewers: z.array(z.string()).optional(),
    recording_duration: z.number().optional(),
    active_seconds: z.number().optional(),
    inactive_seconds: z.number().optional(),
    start_time: z.string().optional(),
    end_time: z.string().nullable().optional(),
    click_count: z.number().optional(),
    keypress_count: z.number().optional(),
    mouse_activity_count: z.number().optional(),
    console_log_count: z.number().optional(),
    console_warn_count: z.number().optional(),
    console_error_count: z.number().optional(),
    start_url: z.string().optional(),
    person: PersonSchema.optional(),
    retention_period_days: z.number().optional(),
    expiry_time: z.string().nullable().optional(),
    recording_ttl: z.number().nullable().optional(),
    snapshot_source: z.string().optional(),
    snapshot_library: z.string().optional(),
    ongoing: z.boolean().optional(),
    activity_score: z.number().nullable().optional(),
    has_summary: z.boolean().optional(),
    summary_outcome: SummaryOutcomeSchema.nullable().optional(),
    external_references: z.array(z.unknown()).optional()
});

const CheckpointSchema = z.object({
    date_from: z.string(),
    after: z.string()
});

const sync = createSync({
    description: 'Sync session recording metadata from PostHog',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    scopes: ['session_recording:read'],
    checkpoint: CheckpointSchema,
    models: {
        SessionRecording: SessionRecordingSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/session-recordings'
        }
    ],

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ?? { date_from: 'all', after: '' };

        const projectId = '309484';
        const dateFrom = checkpoint.date_from || 'all';
        let after = checkpoint.after || '';

        const proxyConfig: ProxyConfiguration = {
            // https://posthog.com/docs/api/session-recordings
            endpoint: `/api/projects/${encodeURIComponent(projectId)}/session_recordings/`,
            params: {
                limit: 100,
                order: 'start_time',
                order_direction: 'ASC',
                date_from: dateFrom,
                ...(after && { after })
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'after',
                cursor_path_in_response: 'next_cursor',
                response_path: 'results',
                limit_name_in_request: 'limit',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    after = typeof nextPageParam === 'string' ? nextPageParam : '';
                }
            },
            retries: 3
        };

        let maxStartTime = '';

        for await (const page of nango.paginate(proxyConfig)) {
            const parseResult = z.array(SessionRecordingSchema).safeParse(page);
            if (!parseResult.success) {
                throw new Error(`Failed to parse session recordings: ${parseResult.error.message}`);
            }

            const recordings = parseResult.data;
            if (recordings.length === 0) {
                continue;
            }

            await nango.batchSave(recordings, 'SessionRecording');

            const lastRecording = recordings[recordings.length - 1];
            if (lastRecording && lastRecording.start_time) {
                maxStartTime = lastRecording.start_time;
            }

            await nango.saveCheckpoint({
                date_from: dateFrom,
                after
            });
        }

        if (maxStartTime) {
            await nango.saveCheckpoint({
                date_from: maxStartTime,
                after: ''
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
