/**
 * Instructions: Returns free/busy information for a set of calendars
 *
 * API Docs: https://developers.google.com/calendar/api/v3/reference/freebusy/query
 */
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const QueryFreeBusyInput = z.object({
    timeMin: z.string(),
    timeMax: z.string(),
    items: z.array(z.any()),
    timeZone: z.string().optional()
});

const QueryFreeBusyOutput = z.object({
    kind: z.string(),
    timeMin: z.string(),
    timeMax: z.string(),
    calendars: z.any()
});

const action = createAction({
    description: 'Returns free/busy information for a set of calendars',
    version: '1.0.0',
    // https://developers.google.com/calendar/api/v3/reference/freebusy/query
    endpoint: {
        method: 'POST',
        path: '/freeBusy',
        group: 'Scheduling'
    },
    input: QueryFreeBusyInput,
    output: QueryFreeBusyOutput,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    exec: async (nango, input): Promise<z.infer<typeof QueryFreeBusyOutput>> => {
        const config: ProxyConfiguration = {
            // https://developers.google.com/calendar/api/v3/reference/freebusy/query
            endpoint: '/calendar/v3/freeBusy',
            data: {
                timeMin: input.timeMin,
                timeMax: input.timeMax,
                items: input.items,
                ...(input.timeZone && { timeZone: input.timeZone })
            },
            retries: 3
        };

        const response = await nango.post(config);

        return {
            kind: response.data.kind,
            timeMin: response.data.timeMin,
            timeMax: response.data.timeMax,
            calendars: response.data.calendars
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
