import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        calendar_id: z.string().describe('Calendar ID containing the event. Example: "primary" or "abc123@group.calendar.google.com"'),
        event_id: z.string().describe('Event ID to delete. Example: "m1s4a7vgu68bbliv0ganj6fhio"')
    })
    .describe('Parameters for deleting a calendar event');

const OutputSchema = z.object({}).describe('Empty success response');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently removes the event from the provider calendar.
 * @pitfalls: Attendees are not notified of the deletion because this action does not expose the sendUpdates parameter.
 */
const action = createAction({
    description: 'Delete a calendar event',
    version: '2.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/calendar/api/v3/reference/events/delete
        await nango.delete({
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(input.calendar_id)}/events/${encodeURIComponent(input.event_id)}`,
            retries: 3
        });

        return {};
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
