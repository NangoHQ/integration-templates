/**
 * Instructions: Returns upcoming events starting from now
 *
 * API Docs: https://developers.google.com/calendar/api/v3/reference/events/list
 */
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const ListUpcomingEventsInput = z.object({
    calendar_id: z.string(),
    maxResults: z.number().optional(),
    singleEvents: z.boolean().optional(),
    timeMin: z.string().optional()
});

const ListUpcomingEventsOutput = z.object({
    kind: z.string(),
    items: z.array(z.any()),
    nextPageToken: z.string().optional()
});

const action = createAction({
    description: 'Returns upcoming events starting from now',
    version: '1.0.0',
    // https://developers.google.com/calendar/api/v3/reference/events/list
    endpoint: {
        method: 'GET',
        path: '/events/upcoming',
        group: 'Events'
    },
    input: ListUpcomingEventsInput,
    output: ListUpcomingEventsOutput,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    exec: async (nango, input): Promise<z.infer<typeof ListUpcomingEventsOutput>> => {
        const config: ProxyConfiguration = {
            // https://developers.google.com/calendar/api/v3/reference/events/list
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(input.calendar_id)}/events`,
            params: {
                timeMin: input.timeMin || new Date().toISOString(),
                orderBy: 'startTime',
                singleEvents: (input.singleEvents !== false).toString(),
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
