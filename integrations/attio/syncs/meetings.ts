import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const LinkedRecordSchema = z.object({
    object_slug: z.string(),
    object_id: z.string(),
    record_id: z.string()
});

const ParticipantSchema = z.object({
    status: z.string(),
    is_organizer: z.boolean(),
    email_address: z.string().nullable()
});

const StartDatetimeSchema = z.object({
    datetime: z.string(),
    timezone: z.string().nullable()
});

const StartDateSchema = z.object({
    date: z.string()
});

const EndDatetimeSchema = z.object({
    datetime: z.string(),
    timezone: z.string().nullable()
});

const EndDateSchema = z.object({
    date: z.string()
});

const ProviderMeetingSchema = z.object({
    id: z.object({
        workspace_id: z.string(),
        meeting_id: z.string()
    }),
    title: z.string(),
    description: z.string(),
    is_all_day: z.boolean(),
    start: z.union([StartDatetimeSchema, StartDateSchema]),
    end: z.union([EndDatetimeSchema, EndDateSchema]),
    participants: z.array(ParticipantSchema),
    linked_records: z.array(LinkedRecordSchema),
    created_at: z.string(),
    created_by_actor: z.object({
        id: z.string().nullable(),
        type: z.string().nullable()
    })
});

const MeetingSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    description: z.string().optional(),
    is_all_day: z.boolean().optional(),
    start_datetime: z.string().optional(),
    start_timezone: z.string().optional(),
    start_date: z.string().optional(),
    end_datetime: z.string().optional(),
    end_timezone: z.string().optional(),
    end_date: z.string().optional(),
    participants: z.array(ParticipantSchema).optional(),
    linked_records: z.array(LinkedRecordSchema).optional(),
    created_at: z.string().optional()
});

const CheckpointSchema = z.object({
    cursor: z.string(),
    in_progress: z.boolean()
});

const sync = createSync({
    description: 'Sync meetings from Attio.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Meeting: MeetingSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/meetings'
        }
    ],
    scopes: ['meeting:read'],

    exec: async (nango) => {
        const checkpoint = CheckpointSchema.partial().parse((await nango.getCheckpoint()) ?? {});
        const inProgress = checkpoint.in_progress ?? false;
        const cursor = checkpoint.cursor ?? '';

        if (!inProgress) {
            await nango.trackDeletesStart('Meeting');
        }

        let nextCursor: string | undefined;

        const proxyConfig: ProxyConfiguration = {
            // https://docs.attio.com/rest-api/endpoint-reference/meetings/list-meetings
            endpoint: '/v2/meetings',
            params: {
                limit: 100,
                ...(cursor && { cursor })
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'pagination.next_cursor',
                response_path: 'data',
                limit_name_in_request: 'limit',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    nextCursor = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const validated = z.array(ProviderMeetingSchema).safeParse(page);
            if (!validated.success) {
                await nango.log('Failed to validate meetings page', { error: validated.error.message });
                throw new Error('Meeting validation failed');
            }

            const meetings = validated.data.map((meeting) => {
                let startDatetime: string | undefined;
                let startTimezone: string | undefined;
                let startDate: string | undefined;
                if ('datetime' in meeting.start) {
                    startDatetime = meeting.start.datetime;
                    startTimezone = meeting.start.timezone ?? undefined;
                } else {
                    startDate = meeting.start.date;
                }

                let endDatetime: string | undefined;
                let endTimezone: string | undefined;
                let endDate: string | undefined;
                if ('datetime' in meeting.end) {
                    endDatetime = meeting.end.datetime;
                    endTimezone = meeting.end.timezone ?? undefined;
                } else {
                    endDate = meeting.end.date;
                }

                return {
                    id: meeting.id.meeting_id,
                    title: meeting.title,
                    description: meeting.description,
                    is_all_day: meeting.is_all_day,
                    ...(startDatetime !== undefined && { start_datetime: startDatetime }),
                    ...(startTimezone !== undefined && { start_timezone: startTimezone }),
                    ...(startDate !== undefined && { start_date: startDate }),
                    ...(endDatetime !== undefined && { end_datetime: endDatetime }),
                    ...(endTimezone !== undefined && { end_timezone: endTimezone }),
                    ...(endDate !== undefined && { end_date: endDate }),
                    participants: meeting.participants,
                    linked_records: meeting.linked_records,
                    created_at: meeting.created_at
                };
            });

            if (meetings.length > 0) {
                await nango.batchSave(meetings, 'Meeting');
            }

            if (nextCursor) {
                await nango.saveCheckpoint({ cursor: nextCursor, in_progress: true });
            }
        }

        await nango.trackDeletesEnd('Meeting');
        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
