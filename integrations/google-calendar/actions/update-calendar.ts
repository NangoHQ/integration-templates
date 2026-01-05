/**
 * Instructions: Updates metadata for a calendar
 *
 * API Docs: https://developers.google.com/calendar/api/v3/reference/calendars/update
 */
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const UpdateCalendarInput = z.object({
    calendar_id: z.string(),
    summary: z.string().optional(),
    description: z.string().optional(),
    timeZone: z.string().optional()
});

const UpdateCalendarOutput = z.object({
    kind: z.string(),
    etag: z.string(),
    id: z.string(),
    summary: z.string(),
    timeZone: z.string()
});

const action = createAction({
    description: 'Updates metadata for a calendar',
    version: '1.0.0',
    // https://developers.google.com/calendar/api/v3/reference/calendars/update
    endpoint: {
        method: 'PUT',
        path: '/calendar',
        group: 'Calendars'
    },
    input: UpdateCalendarInput,
    output: UpdateCalendarOutput,
    scopes: ['https://www.googleapis.com/auth/calendar'],
    exec: async (nango, input): Promise<z.infer<typeof UpdateCalendarOutput>> => {
        const config: ProxyConfiguration = {
            // https://developers.google.com/calendar/api/v3/reference/calendars/update
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(input.calendar_id)}`,
            data: {
                ...(input.summary && { summary: input.summary }),
                ...(input.description && { description: input.description }),
                ...(input.timeZone && { timeZone: input.timeZone })
            },
            retries: 3
        };

        const response = await nango.put(config);

        return {
            kind: response.data.kind,
            etag: response.data.etag,
            id: response.data.id,
            summary: response.data.summary,
            timeZone: response.data.timeZone
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
