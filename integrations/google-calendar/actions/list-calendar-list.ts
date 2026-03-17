import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Page token for pagination. Omit for first page.'),
    maxResults: z.number().optional().describe('Maximum number of calendars to return. Default: 100.')
});

const CalendarSchema = z.object({
    id: z.string(),
    summary: z.string(),
    description: z.string().optional(),
    location: z.string().optional(),
    timeZone: z.string().optional(),
    accessRole: z.string().optional(),
    primary: z.boolean().optional(),
    selected: z.boolean().optional(),
    backgroundColor: z.string().optional(),
    foregroundColor: z.string().optional(),
    hidden: z.boolean().optional(),
    deleted: z.boolean().optional()
});

const OutputSchema = z.object({
    calendars: z.array(CalendarSchema),
    nextPageToken: z.string().optional()
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
                ...(input.maxResults && { maxResults: input.maxResults.toString() })
            },
            retries: 3
        });

        const calendars = response.data.items || [];
        const nextPageToken = response.data.nextPageToken || undefined;

        return {
            calendars: calendars.map((cal: any) => ({
                id: cal.id,
                summary: cal.summary,
                description: cal.description ?? undefined,
                location: cal.location ?? undefined,
                timeZone: cal.timeZone ?? undefined,
                accessRole: cal.accessRole ?? undefined,
                primary: cal.primary ?? false,
                selected: cal.selected ?? false,
                backgroundColor: cal.backgroundColor ?? undefined,
                foregroundColor: cal.foregroundColor ?? undefined,
                hidden: cal.hidden ?? false,
                deleted: cal.deleted ?? false
            })),
            nextPageToken: nextPageToken
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
