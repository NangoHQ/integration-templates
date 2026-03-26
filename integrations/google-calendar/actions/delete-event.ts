import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    calendarId: z.string().describe('Calendar ID. Example: "primary" or "abc123@group.calendar.google.com"'),
    eventId: z.string().describe('Event ID to delete. Example: "tpv6jfth9cbnqhi1f570l45878"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    message: z.string()
});

const action = createAction({
    description: 'Delete a calendar event',
    version: '2.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/delete-event',
        group: 'Events'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar.events'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/calendar/api/v3/reference/events/delete
        await nango.delete({
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(input.calendarId)}/events/${encodeURIComponent(input.eventId)}`,
            retries: 3
        });

        return {
            success: true,
            message: `Event ${input.eventId} successfully deleted from calendar ${input.calendarId}`
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
