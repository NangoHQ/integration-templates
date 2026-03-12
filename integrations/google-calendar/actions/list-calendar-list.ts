import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Page token for pagination. Omit for first page.'),
    max_results: z.number().optional().describe('Maximum number of calendars to return. Default: 100.')
});

const CalendarSchema = z.object({
    id: z.string(),
    summary: z.string(),
    description: z.union([z.string(), z.null()]),
    location: z.union([z.string(), z.null()]),
    time_zone: z.union([z.string(), z.null()]),
    access_role: z.union([z.string(), z.null()]),
    primary: z.boolean().optional(),
    selected: z.boolean().optional(),
    background_color: z.union([z.string(), z.null()]),
    foreground_color: z.union([z.string(), z.null()]),
    hidden: z.boolean().optional(),
    deleted: z.boolean().optional()
});

const OutputSchema = z.object({
    calendars: z.array(CalendarSchema),
    next_cursor: z.union([z.string(), z.null()])
});

const action = createAction({
    description: "List calendars in the user's calendar list",
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/actions/list-calendar-list',
        group: 'Calendars'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/calendar/api/v3/reference/calendarList/list
        const response = await nango.get({
            endpoint: '/calendar/v3/users/me/calendarList',
            params: {
                ...(input.cursor && { pageToken: input.cursor }),
                ...(input.max_results && { maxResults: input.max_results.toString() })
            },
            retries: 3
        });

        const calendars = response.data.items || [];
        const nextPageToken = response.data.nextPageToken || null;

        return {
            calendars: calendars.map((cal: any) => ({
                id: cal.id,
                summary: cal.summary,
                description: cal.description ?? null,
                location: cal.location ?? null,
                time_zone: cal.timeZone ?? null,
                access_role: cal.accessRole ?? null,
                primary: cal.primary ?? false,
                selected: cal.selected ?? false,
                background_color: cal.backgroundColor ?? null,
                foreground_color: cal.foregroundColor ?? null,
                hidden: cal.hidden ?? false,
                deleted: cal.deleted ?? false
            })),
            next_cursor: nextPageToken
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
