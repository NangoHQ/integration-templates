/**
 * Instructions: Returns a calendar from the user's calendar list
 *
 * API Docs: https://developers.google.com/calendar/api/v3/reference/calendarList/get
 */
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const GetCalendarListEntryInput = z.object({
    calendar_id: z.string()
});

const GetCalendarListEntryOutput = z.object({
    kind: z.string(),
    etag: z.string(),
    id: z.string(),
    summary: z.string(),
    accessRole: z.string(),
    backgroundColor: z.string().optional(),
    foregroundColor: z.string().optional()
});

const action = createAction({
    description: "Returns a calendar from the user's calendar list",
    version: '1.0.0',
    // https://developers.google.com/calendar/api/v3/reference/calendarList/get
    endpoint: {
        method: 'GET',
        path: '/calendarList/entry',
        group: 'Calendars'
    },
    input: GetCalendarListEntryInput,
    output: GetCalendarListEntryOutput,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    exec: async (nango, input): Promise<z.infer<typeof GetCalendarListEntryOutput>> => {
        const config: ProxyConfiguration = {
            // https://developers.google.com/calendar/api/v3/reference/calendarList/get
            endpoint: `/calendar/v3/users/me/calendarList/${encodeURIComponent(input.calendar_id)}`,
            retries: 3
        };

        const response = await nango.get(config);

        return {
            kind: response.data.kind,
            etag: response.data.etag,
            id: response.data.id,
            summary: response.data.summary,
            accessRole: response.data.accessRole,
            backgroundColor: response.data.backgroundColor,
            foregroundColor: response.data.foregroundColor
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
