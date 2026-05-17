import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    meeting_id: z.number().describe('The meeting ID in long format. Example: 1234555466')
});

const OccurrenceSchema = z.object({
    duration: z.number().optional(),
    occurrence_id: z.string().optional(),
    start_time: z.string().optional(),
    status: z.string().optional()
});

const RecurrenceSchema = z.object({
    end_date_time: z.string().optional(),
    end_times: z.number().optional(),
    monthly_day: z.number().optional(),
    monthly_week: z.number().optional(),
    monthly_week_day: z.number().optional(),
    repeat_interval: z.number().optional(),
    type: z.number(),
    weekly_days: z.string().optional()
});

const TrackingFieldSchema = z.object({
    field: z.string().optional(),
    value: z.string().optional(),
    visible: z.boolean().optional()
});

const ProviderMeetingSchema = z
    .object({
        assistant_id: z.string().optional(),
        host_email: z.string().optional(),
        host_id: z.string(),
        id: z.number(),
        uuid: z.string(),
        agenda: z.string().optional(),
        created_at: z.string().optional(),
        duration: z.number().optional(),
        encrypted_password: z.string().optional(),
        h323_password: z.string().optional(),
        join_url: z.string().optional(),
        occurrences: z.array(OccurrenceSchema).optional(),
        password: z.string().optional(),
        pmi: z.string().optional(),
        recurrence: RecurrenceSchema.optional(),
        settings: z.record(z.string(), z.unknown()).optional(),
        start_time: z.string().optional(),
        start_url: z.string().optional(),
        status: z.string().optional(),
        timezone: z.string().optional(),
        topic: z.string().optional(),
        tracking_fields: z.array(TrackingFieldSchema).optional(),
        type: z.number()
    })
    .passthrough();

const OutputSchema = ProviderMeetingSchema;

const action = createAction({
    description: 'Retrieve a single meeting from Zoom.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-meeting',
        group: 'Meetings'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['meeting:read', 'meeting:read:admin'],

    exec: async (nango, input) => {
        const response = await nango.get({
            // https://developers.zoom.us/docs/api/rest/reference/zoom-api/methods/#operation/meetingGet
            endpoint: `/meetings/${input.meeting_id}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Meeting not found',
                meeting_id: input.meeting_id
            });
        }

        const meeting = ProviderMeetingSchema.parse(response.data);
        return meeting;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
