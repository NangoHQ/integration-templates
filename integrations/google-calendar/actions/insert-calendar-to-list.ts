/**
 * Instructions: Inserts an existing calendar into the user's calendar list
 *
 * API Docs: https://developers.google.com/calendar/api/v3/reference/calendarList/insert
 */
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InsertCalendarToListInput = z.object({
    id: z.string(),
    colorRgbFormat: z.boolean().optional(),
    backgroundColor: z.string().optional(),
    foregroundColor: z.string().optional()
});

const InsertCalendarToListOutput = z.object({
    kind: z.string(),
    etag: z.string(),
    id: z.string(),
    summary: z.string(),
    accessRole: z.string()
});

const action = createAction({
    description: "Inserts an existing calendar into the user's calendar list",
    version: '1.0.0',
    // https://developers.google.com/calendar/api/v3/reference/calendarList/insert
    endpoint: {
        method: 'POST',
        path: '/calendarList',
        group: 'Calendars'
    },
    input: InsertCalendarToListInput,
    output: InsertCalendarToListOutput,
    scopes: ['https://www.googleapis.com/auth/calendar'],
    exec: async (nango, input): Promise<z.infer<typeof InsertCalendarToListOutput>> => {
        const config: ProxyConfiguration = {
            // https://developers.google.com/calendar/api/v3/reference/calendarList/insert
            endpoint: '/calendar/v3/users/me/calendarList',
            params: {
                ...(input.colorRgbFormat !== undefined && { colorRgbFormat: input.colorRgbFormat.toString() })
            },
            data: {
                id: input.id,
                ...(input.backgroundColor && { backgroundColor: input.backgroundColor }),
                ...(input.foregroundColor && { foregroundColor: input.foregroundColor })
            },
            retries: 3
        };

        const response = await nango.post(config);

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
