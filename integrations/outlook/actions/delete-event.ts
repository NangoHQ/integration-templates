import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    event_id: z.string().describe('The ID of the event to delete. Example: "AAMkAGI2..."'),
    calendar_id: z.string().optional().describe('Optional calendar ID. If omitted, uses the default calendar.')
});

const OutputSchema = z.object({
    success: z.boolean(),
    message: z.string()
});

const action = createAction({
    description: 'Delete an event from a calendar.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-event',
        group: 'Calendar'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Calendars.ReadWrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let endpoint: string;
        if (input.calendar_id) {
            endpoint = `/v1.0/me/calendars/${encodeURIComponent(input.calendar_id)}/events/${encodeURIComponent(input.event_id)}`;
        } else {
            endpoint = `/v1.0/me/events/${encodeURIComponent(input.event_id)}`;
        }

        // https://learn.microsoft.com/graph/api/event-delete
        await nango.delete({
            endpoint: endpoint,
            retries: 3
        });

        return {
            success: true,
            message: `Event ${input.event_id} deleted successfully.`
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
