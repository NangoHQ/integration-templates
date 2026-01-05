/**
 * Instructions: Returns events on a specified calendar with optional filtering
 *
 * API Docs: https://developers.google.com/calendar/api/v3/reference/events/list
 */
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const ListEventsInput = z.object({
    calendar_id: z.string(),
    timeMin: z.string().optional(),
    timeMax: z.string().optional(),
    maxResults: z.number().optional(),
    pageToken: z.string().optional(),
    q: z.string().optional(),
    singleEvents: z.boolean().optional(),
    orderBy: z.string().optional()
});

const ListEventsOutput = z.object({
    kind: z.string(),
    etag: z.string(),
    summary: z.string(),
    nextPageToken: z.string().optional(),
    items: z.array(z.any())
});

const action = createAction({
    description: 'Returns events on a specified calendar with optional filtering',
    version: '1.0.0',
    // https://developers.google.com/calendar/api/v3/reference/events/list
    endpoint: {
        method: 'GET',
        path: '/events/list',
        group: 'Events'
    },
    input: ListEventsInput,
    output: ListEventsOutput,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    exec: async (nango, input): Promise<z.infer<typeof ListEventsOutput>> => {
        const config: ProxyConfiguration = {
            // https://developers.google.com/calendar/api/v3/reference/events/list
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(input.calendar_id)}/events`,
            params: {
                ...(input.timeMin && { timeMin: input.timeMin }),
                ...(input.timeMax && { timeMax: input.timeMax }),
                ...(input.maxResults && { maxResults: input.maxResults.toString() }),
                ...(input.pageToken && { pageToken: input.pageToken }),
                ...(input.q && { q: input.q }),
                ...(input.singleEvents !== undefined && { singleEvents: input.singleEvents.toString() }),
                ...(input.orderBy && { orderBy: input.orderBy })
            },
            retries: 3
        };

        const response = await nango.get(config);

        return {
            kind: response.data.kind,
            etag: response.data.etag,
            summary: response.data.summary,
            nextPageToken: response.data.nextPageToken,
            items: response.data.items || []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
