/**
 * Instructions: Deletes a secondary calendar
 *
 * API Docs: https://developers.google.com/calendar/api/v3/reference/calendars/delete
 */
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const DeleteCalendarInput = z.object({
    calendar_id: z.string()
});

const DeleteCalendarOutput = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Deletes a secondary calendar',
    version: '1.0.0',
    // https://developers.google.com/calendar/api/v3/reference/calendars/delete
    endpoint: {
        method: 'DELETE',
        path: '/calendar',
        group: 'Calendars'
    },
    input: DeleteCalendarInput,
    output: DeleteCalendarOutput,
    scopes: ['https://www.googleapis.com/auth/calendar'],
    exec: async (nango, input): Promise<z.infer<typeof DeleteCalendarOutput>> => {
        const config: ProxyConfiguration = {
            // https://developers.google.com/calendar/api/v3/reference/calendars/delete
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(input.calendar_id)}`,
            retries: 3
        };

        await nango.delete(config);

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
