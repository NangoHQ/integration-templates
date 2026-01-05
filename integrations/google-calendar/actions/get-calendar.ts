/**
 * Instructions: Returns metadata for a calendar by calendar ID
 *
 * API Docs: https://developers.google.com/calendar/api/v3/reference/calendars/get
 */
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const GetCalendarInput = z.object({
    calendar_id: z.string()
});

const GetCalendarOutput = z.object({
    kind: z.string(),
    etag: z.string(),
    id: z.string(),
    summary: z.string(),
    description: z.string().optional(),
    timeZone: z.string()
});

const action = createAction({
    description: 'Returns metadata for a calendar by calendar ID',
    version: '1.0.0',
    // https://developers.google.com/calendar/api/v3/reference/calendars/get
    endpoint: {
        method: 'GET',
        path: '/calendar',
        group: 'Calendars'
    },
    input: GetCalendarInput,
    output: GetCalendarOutput,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    exec: async (nango, input): Promise<z.infer<typeof GetCalendarOutput>> => {
        const config: ProxyConfiguration = {
            // https://developers.google.com/calendar/api/v3/reference/calendars/get
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(input.calendar_id)}`,
            retries: 3
        };

        const response = await nango.get(config);

        return {
            kind: response.data.kind,
            etag: response.data.etag,
            id: response.data.id,
            summary: response.data.summary,
            description: response.data.description,
            timeZone: response.data.timeZone
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
