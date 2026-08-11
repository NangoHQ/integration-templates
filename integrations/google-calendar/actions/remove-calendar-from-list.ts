import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        calendarId: z
            .string()
            .describe(
                'The ID of the calendar to remove from the user\'s calendar list. Use "primary" for the primary calendar, or retrieve IDs from the calendar list.'
            )
    })
    .describe("Input for removing a calendar from the user's calendar list");

const OutputSchema = z.null().describe('Empty success response indicating the calendar was removed from the list');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently removes the calendar from the user's calendar list. The list entry is destroyed and must be recreated to restore it.
 * @pitfalls: You cannot remove a calendar you own from your list with this action; only calendars you are subscribed to but do not own can be removed.
 */
const action = createAction({
    description: "Remove a calendar from the user's calendar list",
    version: '2.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/calendar/api/v3/reference/calendarList/delete
        await nango.delete({
            endpoint: `/calendar/v3/users/me/calendarList/${encodeURIComponent(input.calendarId)}`,
            retries: 3
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
