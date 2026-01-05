/**
 * Instructions: Searches for events matching a text query across calendars
 *
 * API Docs: https://developers.google.com/calendar/api/v3/reference/events/list
 */
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const SearchEventsInput = z.object({
    calendar_id: z.string(),
    q: z.string(),
    timeMin: z.string().optional(),
    timeMax: z.string().optional(),
    maxResults: z.number().optional()
});

const SearchEventsOutput = z.object({
    kind: z.string(),
    items: z.array(z.any()),
    nextPageToken: z.string().optional()
});

const action = createAction({
    description: 'Searches for events matching a text query across calendars',
    version: '1.0.0',
    // https://developers.google.com/calendar/api/v3/reference/events/list
    endpoint: {
        method: 'GET',
        path: '/events/search',
        group: 'Events'
    },
    input: SearchEventsInput,
    output: SearchEventsOutput,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    exec: async (nango, input): Promise<z.infer<typeof SearchEventsOutput>> => {
        const config: ProxyConfiguration = {
            // https://developers.google.com/calendar/api/v3/reference/events/list
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(input.calendar_id)}/events`,
            params: {
                q: input.q,
                ...(input.timeMin && { timeMin: input.timeMin }),
                ...(input.timeMax && { timeMax: input.timeMax }),
                ...(input.maxResults && { maxResults: input.maxResults.toString() })
            },
            retries: 3
        };

        const response = await nango.get(config);

        return {
            kind: response.data.kind,
            items: response.data.items || [],
            nextPageToken: response.data.nextPageToken
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
