/**
 * Instructions: Returns an event based on its calendar and event ID
 *
 * API Docs: https://developers.google.com/calendar/api/v3/reference/events/get
 */
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const GetEventInput = z.object({
    calendar_id: z.string(),
    event_id: z.string()
});

const GetEventOutput = z.object({
    kind: z.string(),
    etag: z.string(),
    id: z.string(),
    status: z.string(),
    summary: z.string(),
    start: z.any(),
    end: z.any()
});

const action = createAction({
    description: 'Returns an event based on its calendar and event ID',
    version: '1.0.0',
    // https://developers.google.com/calendar/api/v3/reference/events/get
    endpoint: {
        method: 'GET',
        path: '/event',
        group: 'Events'
    },
    input: GetEventInput,
    output: GetEventOutput,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    exec: async (nango, input): Promise<z.infer<typeof GetEventOutput>> => {
        const config: ProxyConfiguration = {
            // https://developers.google.com/calendar/api/v3/reference/events/get
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(input.calendar_id)}/events/${encodeURIComponent(input.event_id)}`,
            retries: 3
        };

        const response = await nango.get(config);

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
