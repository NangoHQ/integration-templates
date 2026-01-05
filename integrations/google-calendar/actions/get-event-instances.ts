/**
 * Instructions: Returns instances of a recurring event
 *
 * API Docs: https://developers.google.com/calendar/api/v3/reference/events/instances
 */
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const GetEventInstancesInput = z.object({
    calendar_id: z.string(),
    event_id: z.string(),
    timeMin: z.string().optional(),
    timeMax: z.string().optional(),
    maxResults: z.number().optional(),
    pageToken: z.string().optional()
});

const GetEventInstancesOutput = z.object({
    kind: z.string(),
    etag: z.string(),
    summary: z.string(),
    nextPageToken: z.string().optional(),
    items: z.array(z.any())
});

const action = createAction({
    description: 'Returns instances of a recurring event',
    version: '1.0.0',
    // https://developers.google.com/calendar/api/v3/reference/events/instances
    endpoint: {
        method: 'GET',
        path: '/events/instances',
        group: 'Events'
    },
    input: GetEventInstancesInput,
    output: GetEventInstancesOutput,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    exec: async (nango, input): Promise<z.infer<typeof GetEventInstancesOutput>> => {
        const config: ProxyConfiguration = {
            // https://developers.google.com/calendar/api/v3/reference/events/instances
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(input.calendar_id)}/events/${encodeURIComponent(input.event_id)}/instances`,
            params: {
                ...(input.timeMin && { timeMin: input.timeMin }),
                ...(input.timeMax && { timeMax: input.timeMax }),
                ...(input.maxResults && { maxResults: input.maxResults.toString() }),
                ...(input.pageToken && { pageToken: input.pageToken })
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
