import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('The user ID or email address of the user. For user-level apps, pass `me` as the value for userId.'),
    topic: z.string().optional().describe('Meeting topic.'),
    type: z
        .number()
        .optional()
        .describe('Meeting Type: 1 - Instant meeting, 2 - Scheduled meeting, 3 - Recurring meeting with no fixed time, 8 - Recurring meeting with fixed time.'),
    start_time: z.string().optional().describe('Meeting start time in ISO 8601 format (yyyy-MM-ddTHH:mm:ssZ).'),
    duration: z.number().optional().describe('Meeting duration in minutes. Used for scheduled meetings only.'),
    timezone: z.string().optional().describe('Time zone to format start_time. For example, "America/Los_Angeles".'),
    password: z.string().optional().describe('Passcode to join the meeting. Max 10 characters.'),
    agenda: z.string().optional().describe('Meeting description.'),
    settings: z
        .object({
            host_video: z.boolean().optional(),
            participant_video: z.boolean().optional(),
            join_before_host: z.boolean().optional(),
            mute_upon_entry: z.boolean().optional(),
            waiting_room: z.boolean().optional(),
            auto_recording: z.enum(['local', 'cloud', 'none']).optional()
        })
        .optional()
        .describe('Meeting settings.')
});

const ProviderMeetingSchema = z.object({
    id: z.number(),
    topic: z.string().optional(),
    type: z.number().optional(),
    start_time: z.string().optional(),
    duration: z.number().optional(),
    timezone: z.string().optional(),
    password: z.string().optional(),
    agenda: z.string().optional(),
    host_id: z.string().optional(),
    host_email: z.string().optional(),
    join_url: z.string().optional(),
    start_url: z.string().optional(),
    created_at: z.string().optional(),
    settings: z
        .object({
            host_video: z.boolean().optional(),
            participant_video: z.boolean().optional(),
            join_before_host: z.boolean().optional(),
            mute_upon_entry: z.boolean().optional(),
            waiting_room: z.boolean().optional(),
            auto_recording: z.string().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.number().describe('Meeting ID.'),
    topic: z.string().optional(),
    type: z.number().optional(),
    start_time: z.string().optional(),
    duration: z.number().optional(),
    timezone: z.string().optional(),
    password: z.string().optional(),
    agenda: z.string().optional(),
    host_id: z.string().optional(),
    host_email: z.string().optional(),
    join_url: z.string().optional(),
    start_url: z.string().optional(),
    created_at: z.string().optional(),
    settings: z
        .object({
            host_video: z.boolean().optional(),
            participant_video: z.boolean().optional(),
            join_before_host: z.boolean().optional(),
            mute_upon_entry: z.boolean().optional(),
            waiting_room: z.boolean().optional(),
            auto_recording: z.string().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Create a meeting in Zoom.',
    version: '2.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['meeting:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.zoom.us/docs/api/rest/reference/zoom-api/methods/#operation/meetingCreate
        const response = await nango.post({
            endpoint: `/users/${input.userId}/meetings`,
            data: {
                ...(input.topic !== undefined && { topic: input.topic }),
                ...(input.type !== undefined && { type: input.type }),
                ...(input.start_time !== undefined && { start_time: input.start_time }),
                ...(input.duration !== undefined && { duration: input.duration }),
                ...(input.timezone !== undefined && { timezone: input.timezone }),
                ...(input.password !== undefined && { password: input.password }),
                ...(input.agenda !== undefined && { agenda: input.agenda }),
                ...(input.settings !== undefined && { settings: input.settings })
            },
            retries: 10
        });

        const meeting = ProviderMeetingSchema.parse(response.data);

        return {
            id: meeting.id,
            ...(meeting.topic !== undefined && { topic: meeting.topic }),
            ...(meeting.type !== undefined && { type: meeting.type }),
            ...(meeting.start_time !== undefined && { start_time: meeting.start_time }),
            ...(meeting.duration !== undefined && { duration: meeting.duration }),
            ...(meeting.timezone !== undefined && { timezone: meeting.timezone }),
            ...(meeting.password !== undefined && { password: meeting.password }),
            ...(meeting.agenda !== undefined && { agenda: meeting.agenda }),
            ...(meeting.host_id !== undefined && { host_id: meeting.host_id }),
            ...(meeting.host_email !== undefined && { host_email: meeting.host_email }),
            ...(meeting.join_url !== undefined && { join_url: meeting.join_url }),
            ...(meeting.start_url !== undefined && { start_url: meeting.start_url }),
            ...(meeting.created_at !== undefined && { created_at: meeting.created_at }),
            ...(meeting.settings !== undefined && { settings: meeting.settings })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
