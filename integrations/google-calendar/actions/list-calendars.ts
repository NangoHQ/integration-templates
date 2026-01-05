/**
 * Instructions: Returns all calendars on the user's calendar list
 *
 * API Docs: https://developers.google.com/calendar/api/v3/reference/calendarList/list
 */
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const ListCalendarsInput = z.object({
    maxResults: z.number().optional(),
    pageToken: z.string().optional(),
    showDeleted: z.boolean().optional(),
    showHidden: z.boolean().optional()
});

const ListCalendarsOutput = z.object({
    kind: z.string(),
    etag: z.string(),
    nextPageToken: z.string().optional(),
    items: z.array(z.any())
});

const action = createAction({
    description: "Returns all calendars on the user's calendar list",
    version: '1.0.0',
    // https://developers.google.com/calendar/api/v3/reference/calendarList/list
    endpoint: {
        method: 'GET',
        path: '/calendars/list',
        group: 'Calendars'
    },
    input: ListCalendarsInput,
    output: ListCalendarsOutput,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    exec: async (nango, input): Promise<z.infer<typeof ListCalendarsOutput>> => {
        const config: ProxyConfiguration = {
            // https://developers.google.com/calendar/api/v3/reference/calendarList/list
            endpoint: '/calendar/v3/users/me/calendarList',
            params: {
                ...(input.maxResults && { maxResults: input.maxResults.toString() }),
                ...(input.pageToken && { pageToken: input.pageToken }),
                ...(input.showDeleted !== undefined && { showDeleted: input.showDeleted.toString() }),
                ...(input.showHidden !== undefined && { showHidden: input.showHidden.toString() })
            },
            retries: 3
        };

        const response = await nango.get(config);

        return {
            kind: response.data.kind,
            etag: response.data.etag,
            nextPageToken: response.data.nextPageToken,
            items: response.data.items
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
