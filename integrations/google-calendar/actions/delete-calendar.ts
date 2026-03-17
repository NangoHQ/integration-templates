import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    calendarId: z.string().describe('Calendar ID to delete. Example: "c_abc123@group.calendar.google.com"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    calendarId: z.string()
});

const action = createAction({
    description: 'Delete a secondary calendar',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/delete-calendar',
        group: 'Calendars'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/calendar/api/v3/reference/calendars/delete
        await nango.delete({
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(input.calendarId)}`,
            retries: 3
        });

        return {
            success: true,
            calendarId: input.calendarId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
