/**
 * Instructions: Moves an event to another calendar changing its organizer
 *
 * API Docs: https://developers.google.com/calendar/api/v3/reference/events/move
 */
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const MoveEventInput = z.object({
    calendar_id: z.string(),
    event_id: z.string(),
    destination_calendar_id: z.string()
});

const MoveEventOutput = z.object({
    kind: z.string(),
    etag: z.string(),
    id: z.string(),
    status: z.string(),
    summary: z.string(),
    organizer: z.any()
});

const action = createAction({
    description: 'Moves an event to another calendar changing its organizer',
    version: '1.0.0',
    // https://developers.google.com/calendar/api/v3/reference/events/move
    endpoint: {
        method: 'POST',
        path: '/events/move',
        group: 'Events'
    },
    input: MoveEventInput,
    output: MoveEventOutput,
    scopes: ['https://www.googleapis.com/auth/calendar'],
    exec: async (nango, input): Promise<z.infer<typeof MoveEventOutput>> => {
        const config: ProxyConfiguration = {
            // https://developers.google.com/calendar/api/v3/reference/events/move
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(input.calendar_id)}/events/${encodeURIComponent(input.event_id)}/move`,
            params: {
                destination: input.destination_calendar_id
            },
            retries: 3
        };

        const response = await nango.post(config);

        return {
            kind: response.data.kind,
            etag: response.data.etag,
            id: response.data.id,
            status: response.data.status,
            summary: response.data.summary,
            organizer: response.data.organizer
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
