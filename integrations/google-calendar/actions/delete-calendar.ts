import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        calendarId: z.string().describe('The ID of the calendar to delete.')
    })
    .describe('Input for deleting a Google Calendar.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes a secondary calendar from Google Calendar.
 * @pitfalls: This action only deletes secondary calendars.
 */
const action = createAction({
    description: 'Delete a calendar',
    version: '2.0.2',
    input: InputSchema,
    output: z.null(),
    scopes: ['https://www.googleapis.com/auth/calendar'],

    exec: async (nango, input): Promise<null> => {
        // https://developers.google.com/workspace/calendar/api/v3/reference/calendars/delete
        await nango.delete({
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(input.calendarId)}`,
            retries: 1
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
