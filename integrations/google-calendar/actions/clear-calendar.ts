/**
 * Instructions: Clears a primary calendar by deleting all events
 *
 * API Docs: https://developers.google.com/calendar/api/v3/reference/calendars/clear
 */
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const ClearCalendarInput = z.object({
    calendar_id: z.string()
});

const ClearCalendarOutput = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Clears a primary calendar by deleting all events',
    version: '1.0.0',
    // https://developers.google.com/calendar/api/v3/reference/calendars/clear
    endpoint: {
        method: 'POST',
        path: '/calendar/clear',
        group: 'Calendars'
    },
    input: ClearCalendarInput,
    output: ClearCalendarOutput,
    scopes: ['https://www.googleapis.com/auth/calendar'],
    exec: async (nango, input): Promise<z.infer<typeof ClearCalendarOutput>> => {
        const config: ProxyConfiguration = {
            // https://developers.google.com/calendar/api/v3/reference/calendars/clear
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(input.calendar_id)}/clear`,
            retries: 3
        };

        await nango.post(config);

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
