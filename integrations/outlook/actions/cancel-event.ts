import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    eventId: z.string().describe('The ID of the event to cancel. Example: "AQMkAGI2..."'),
    comment: z.string().optional().describe('An optional comment to include in the cancellation message sent to attendees.')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Cancel a meeting and send the cancellation notice to attendees',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Calendars.ReadWrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: { Comment?: string } = {};
        if (input.comment !== undefined) {
            requestBody.Comment = input.comment;
        }

        // https://learn.microsoft.com/graph/api/event-cancel?view=graph-rest-1.0
        await nango.post({
            endpoint: `/v1.0/me/events/${encodeURIComponent(input.eventId)}/cancel`,
            data: requestBody,
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
