import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        calendarId: z
            .literal('primary')
            .optional()
            .describe('Calendar identifier. This operation is only supported for the primary calendar; the only valid value is "primary".')
    })
    .describe('Clears all events from the primary calendar.');

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the calendar was cleared successfully'),
    calendarId: z.string().describe('The calendar ID that was cleared')
});

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes all events from the primary calendar via the provider clear endpoint.
 * @pitfalls: Only works on the primary calendar and permanently deletes all events with no recovery.
 */
const action = createAction({
    description: 'Clear the primary calendar by deleting all events.',
    version: '2.0.2',
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
