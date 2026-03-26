import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    calendarId: z
        .string()
        .describe('Calendar ID to remove from the user\'s calendar list. Example: "primary" or a calendar ID like "abc123xyz@group.calendar.google.com"')
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the calendar was successfully removed from the list')
});

const action = createAction({
    description: "Remove a calendar from the user's calendar list",
    version: '2.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/remove-calendar-from-list',
        group: 'Calendars'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/calendar/api/v3/reference/calendarList/delete
        await nango.delete({
            endpoint: `/calendar/v3/users/me/calendarList/${encodeURIComponent(input.calendarId)}`,
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
