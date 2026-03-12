import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    calendar_id: z.string().describe('Calendar identifier. Use "primary" for the primary calendar. Example: "primary" or "abc123@group.calendar.google.com"')
});

const OutputSchema = z.object({
    id: z.string(),
    summary: z.union([z.string(), z.null()]),
    description: z.union([z.string(), z.null()]),
    access_role: z.union([z.string(), z.null()]),
    color_id: z.union([z.string(), z.null()]),
    background_color: z.union([z.string(), z.null()]),
    foreground_color: z.union([z.string(), z.null()]),
    primary: z.boolean(),
    selected: z.boolean(),
    time_zone: z.union([z.string(), z.null()]),
    hidden: z.boolean()
});

const action = createAction({
    description: 'Retrieve a calendar list entry with access role and colors',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/actions/get-calendar-list-entry',
        group: 'Calendars'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/calendar/api/v3/reference/calendarList/get
        const response = await nango.get({
            endpoint: `/calendar/v3/users/me/calendarList/${input.calendar_id}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Calendar not found',
                calendar_id: input.calendar_id
            });
        }

        const calendar = response.data;

        return {
            id: calendar.id,
            summary: calendar.summary ?? null,
            description: calendar.description ?? null,
            access_role: calendar.accessRole ?? null,
            color_id: calendar.colorId ?? null,
            background_color: calendar.backgroundColor ?? null,
            foreground_color: calendar.foregroundColor ?? null,
            primary: calendar.primary ?? false,
            selected: calendar.selected ?? false,
            time_zone: calendar.timeZone ?? null,
            hidden: calendar.hidden ?? false
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
