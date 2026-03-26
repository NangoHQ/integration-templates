import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    calendarId: z.string().optional().describe('Calendar identifier. Use "primary" for the primary calendar. Example: "primary"')
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the calendar was cleared successfully'),
    calendarId: z.string().describe('The calendar ID that was cleared')
});

const action = createAction({
    description: 'Clear a calendar by deleting all events',
    version: '2.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/clear-calendar',
        group: 'Calendars'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const calendarId = input.calendarId || 'primary';

        // https://developers.google.com/workspace/calendar/api/v3/reference/calendars/clear
        await nango.post({
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(calendarId)}/clear`,
            retries: 3
        });

        return {
            success: true,
            calendarId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
