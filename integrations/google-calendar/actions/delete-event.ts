/**
 * Instructions: Deletes an event from a calendar
 *
 * API Docs: https://developers.google.com/calendar/api/v3/reference/events/delete
 */
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const DeleteEventInput = z.object({
    calendar_id: z.string(),
    event_id: z.string(),
    sendUpdates: z.string().optional()
});

const DeleteEventOutput = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Deletes an event from a calendar',
    version: '1.0.0',
    // https://developers.google.com/calendar/api/v3/reference/events/delete
    endpoint: {
        method: 'DELETE',
        path: '/event',
        group: 'Events'
    },
    input: DeleteEventInput,
    output: DeleteEventOutput,
    scopes: ['https://www.googleapis.com/auth/calendar'],
    exec: async (nango, input): Promise<z.infer<typeof DeleteEventOutput>> => {
        const config: ProxyConfiguration = {
            // https://developers.google.com/calendar/api/v3/reference/events/delete
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(input.calendar_id)}/events/${encodeURIComponent(input.event_id)}`,
            params: {
                ...(input.sendUpdates && { sendUpdates: input.sendUpdates })
            },
            retries: 3
        };

        await nango.delete(config);

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
