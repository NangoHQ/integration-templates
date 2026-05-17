import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    meetingId: z.number().describe('The meeting ID in long format. Example: 1234567890'),
    topic: z.string().optional().describe('Meeting topic.'),
    type: z.number().optional().describe('Meeting type: 1=Instant, 2=Scheduled, 3=Recurring no fixed time, 8=Recurring with fixed time.'),
    start_time: z.string().optional().describe('Meeting start time in ISO 8601 format. Example: 2024-01-15T10:00:00Z'),
    duration: z.number().optional().describe('Meeting duration in minutes.'),
    timezone: z.string().optional().describe('Time zone for start_time. Example: America/Los_Angeles'),
    password: z.string().optional().describe('Meeting password.'),
    agenda: z.string().optional().describe('Meeting description/agenda.')
});

const action = createAction({
    description: 'Update a meeting in Zoom.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-meeting',
        group: 'Meetings'
    },
    input: InputSchema,
    output: z.null(),
    scopes: ['meeting:write', 'meeting:write:admin'],

    exec: async (nango, input): Promise<null> => {
        // https://developers.zoom.us/docs/api/rest/reference/zoom-api/methods/#operation/meetingUpdate
        await nango.patch({
            endpoint: `/meetings/${input.meetingId}`,
            data: {
                ...(input.topic !== undefined && { topic: input.topic }),
                ...(input.type !== undefined && { type: input.type }),
                ...(input.start_time !== undefined && { start_time: input.start_time }),
                ...(input.duration !== undefined && { duration: input.duration }),
                ...(input.timezone !== undefined && { timezone: input.timezone }),
                ...(input.password !== undefined && { password: input.password }),
                ...(input.agenda !== undefined && { agenda: input.agenda })
            },
            retries: 1
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
