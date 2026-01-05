/**
 * Instructions: Updates an existing calendar on the user's calendar list
 *
 * API Docs: https://developers.google.com/calendar/api/v3/reference/calendarList/update
 */
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const UpdateCalendarListEntryInput = z.object({
    calendar_id: z.string(),
    colorRgbFormat: z.boolean().optional(),
    backgroundColor: z.string().optional(),
    foregroundColor: z.string().optional(),
    hidden: z.boolean().optional(),
    selected: z.boolean().optional()
});

const UpdateCalendarListEntryOutput = z.object({
    kind: z.string(),
    etag: z.string(),
    id: z.string(),
    summary: z.string(),
    accessRole: z.string()
});

const action = createAction({
    description: "Updates an existing calendar on the user's calendar list",
    version: '1.0.0',
    // https://developers.google.com/calendar/api/v3/reference/calendarList/update
    endpoint: {
        method: 'PUT',
        path: '/calendarList/entry',
        group: 'Calendars'
    },
    input: UpdateCalendarListEntryInput,
    output: UpdateCalendarListEntryOutput,
    scopes: ['https://www.googleapis.com/auth/calendar'],
    exec: async (nango, input): Promise<z.infer<typeof UpdateCalendarListEntryOutput>> => {
        const config: ProxyConfiguration = {
            // https://developers.google.com/calendar/api/v3/reference/calendarList/update
            endpoint: `/calendar/v3/users/me/calendarList/${encodeURIComponent(input.calendar_id)}`,
            params: {
                ...(input.colorRgbFormat !== undefined && { colorRgbFormat: input.colorRgbFormat.toString() })
            },
            data: {
                ...(input.backgroundColor && { backgroundColor: input.backgroundColor }),
                ...(input.foregroundColor && { foregroundColor: input.foregroundColor }),
                ...(input.hidden !== undefined && { hidden: input.hidden }),
                ...(input.selected !== undefined && { selected: input.selected })
            },
            retries: 3
        };

        const response = await nango.put(config);

        return {
            kind: response.data.kind,
            etag: response.data.etag,
            id: response.data.id,
            summary: response.data.summary,
            accessRole: response.data.accessRole
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
