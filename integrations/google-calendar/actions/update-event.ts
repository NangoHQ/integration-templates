/**
 * Instructions: Updates an existing event on a calendar
 *
 * API Docs: https://developers.google.com/calendar/api/v3/reference/events/update
 */
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const UpdateEventInput = z.object({
    calendar_id: z.string(),
    event_id: z.string(),
    summary: z.string().optional(),
    start: z.any().optional(),
    end: z.any().optional(),
    description: z.string().optional(),
    location: z.string().optional(),
    attendees: z.array(z.any()).optional()
});

const UpdateEventOutput = z.object({
    kind: z.string(),
    etag: z.string(),
    id: z.string(),
    status: z.string(),
    summary: z.string(),
    start: z.any(),
    end: z.any()
});

const action = createAction({
    description: 'Updates an existing event on a calendar',
    version: '1.0.0',
    // https://developers.google.com/calendar/api/v3/reference/events/update
    endpoint: {
        method: 'PUT',
        path: '/event',
        group: 'Events'
    },
    input: UpdateEventInput,
    output: UpdateEventOutput,
    scopes: ['https://www.googleapis.com/auth/calendar'],
    exec: async (nango, input): Promise<z.infer<typeof UpdateEventOutput>> => {
        // First get the existing event to preserve unmodified fields
        const getConfig: ProxyConfiguration = {
            // https://developers.google.com/calendar/api/v3/reference/events/get
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(input.calendar_id)}/events/${encodeURIComponent(input.event_id)}`,
            retries: 3
        };

        const existingEvent = await nango.get(getConfig);

        const config: ProxyConfiguration = {
            // https://developers.google.com/calendar/api/v3/reference/events/update
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(input.calendar_id)}/events/${encodeURIComponent(input.event_id)}`,
            data: {
                ...existingEvent.data,
                ...(input.summary && { summary: input.summary }),
                ...(input.start && { start: input.start }),
                ...(input.end && { end: input.end }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.location !== undefined && { location: input.location }),
                ...(input.attendees && { attendees: input.attendees })
            },
            retries: 3
        };

        const response = await nango.put(config);

        return {
            kind: response.data.kind,
            etag: response.data.etag,
            id: response.data.id,
            status: response.data.status,
            summary: response.data.summary,
            start: response.data.start,
            end: response.data.end
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
