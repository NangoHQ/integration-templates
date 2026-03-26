import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    calendarId: z.string().describe('Calendar identifier. Use "primary" for the primary calendar. Example: "primary" or "abc123@group.calendar.google.com"')
});

const OutputSchema = z.object({
    id: z.string(),
    summary: z.string().optional(),
    description: z.string().optional(),
    accessRole: z.string().optional(),
    colorId: z.string().optional(),
    backgroundColor: z.string().optional(),
    foregroundColor: z.string().optional(),
    primary: z.boolean(),
    selected: z.boolean(),
    timeZone: z.string().optional(),
    hidden: z.boolean()
});

const action = createAction({
    description: 'Retrieve a calendar list entry with access role and colors',
    version: '2.0.0',

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
            endpoint: `/calendar/v3/users/me/calendarList/${input.calendarId}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Calendar not found',
                calendarId: input.calendarId
            });
        }

        const calendar = response.data;

        return {
            id: calendar.id,
            summary: calendar.summary ?? undefined,
            description: calendar.description ?? undefined,
            accessRole: calendar.accessRole ?? undefined,
            colorId: calendar.colorId ?? undefined,
            backgroundColor: calendar.backgroundColor ?? undefined,
            foregroundColor: calendar.foregroundColor ?? undefined,
            primary: calendar.primary ?? false,
            selected: calendar.selected ?? false,
            timeZone: calendar.timeZone ?? undefined,
            hidden: calendar.hidden ?? false
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
