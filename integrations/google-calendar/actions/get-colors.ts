/**
 * Instructions: Returns the color definitions for calendars and events
 *
 * API Docs: https://developers.google.com/calendar/api/v3/reference/colors/get
 */
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const GetColorsInput = z.object({});

const GetColorsOutput = z.object({
    kind: z.string(),
    updated: z.string(),
    calendar: z.any(),
    event: z.any()
});

const action = createAction({
    description: 'Returns the color definitions for calendars and events',
    version: '1.0.0',
    // https://developers.google.com/calendar/api/v3/reference/colors/get
    endpoint: {
        method: 'GET',
        path: '/colors',
        group: 'Settings'
    },
    input: GetColorsInput,
    output: GetColorsOutput,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    exec: async (nango, _input): Promise<z.infer<typeof GetColorsOutput>> => {
        const config: ProxyConfiguration = {
            // https://developers.google.com/calendar/api/v3/reference/colors/get
            endpoint: '/calendar/v3/colors',
            retries: 3
        };

        const response = await nango.get(config);

        return {
            kind: response.data.kind,
            updated: response.data.updated,
            calendar: response.data.calendar,
            event: response.data.event
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
