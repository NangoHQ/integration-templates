/**
 * Instructions: Removes a calendar from the user's calendar list
 *
 * API Docs: https://developers.google.com/calendar/api/v3/reference/calendarList/delete
 */
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const RemoveCalendarFromListInput = z.object({
    calendar_id: z.string()
});

const RemoveCalendarFromListOutput = z.object({
    success: z.boolean()
});

const action = createAction({
    description: "Removes a calendar from the user's calendar list",
    version: '1.0.0',
    // https://developers.google.com/calendar/api/v3/reference/calendarList/delete
    endpoint: {
        method: 'DELETE',
        path: '/calendarList/entry',
        group: 'Calendars'
    },
    input: RemoveCalendarFromListInput,
    output: RemoveCalendarFromListOutput,
    scopes: ['https://www.googleapis.com/auth/calendar'],
    exec: async (nango, input): Promise<z.infer<typeof RemoveCalendarFromListOutput>> => {
        const config: ProxyConfiguration = {
            // https://developers.google.com/calendar/api/v3/reference/calendarList/delete
            endpoint: `/calendar/v3/users/me/calendarList/${encodeURIComponent(input.calendar_id)}`,
            retries: 3
        };

        await nango.delete(config);

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
