import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    calendarId: z.string().describe('The ID of the calendar to delete. Example: "AAMkAGI..."')
});

const OutputSchema = z.object({
    success: z.boolean(),
    calendarId: z.string()
});

const action = createAction({
    description: 'Delete a secondary calendar.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Calendars.ReadWrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/en-us/graph/api/calendar-delete
        await nango.delete({
            endpoint: `/v1.0/me/calendars/${encodeURIComponent(input.calendarId)}`,
            retries: 1
        });

        return {
            success: true,
            calendarId: input.calendarId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
