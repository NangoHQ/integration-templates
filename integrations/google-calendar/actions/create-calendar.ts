/**
 * Instructions: Creates a new secondary calendar with the specified title
 *
 * API Docs: https://developers.google.com/calendar/api/v3/reference/calendars/insert
 */
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const CreateCalendarInput = z.object({
    summary: z.string(),
    description: z.string().optional(),
    timeZone: z.string().optional()
});

const CreateCalendarOutput = z.object({
    kind: z.string(),
    etag: z.string(),
    id: z.string(),
    summary: z.string(),
    timeZone: z.string()
});

const action = createAction({
    description: 'Creates a new secondary calendar with the specified title',
    version: '1.0.0',
    // https://developers.google.com/calendar/api/v3/reference/calendars/insert
    endpoint: {
        method: 'POST',
        path: '/calendars',
        group: 'Calendars'
    },
    input: CreateCalendarInput,
    output: CreateCalendarOutput,
    scopes: ['https://www.googleapis.com/auth/calendar'],
    exec: async (nango, input): Promise<z.infer<typeof CreateCalendarOutput>> => {
        const config: ProxyConfiguration = {
            // https://developers.google.com/calendar/api/v3/reference/calendars/insert
            endpoint: '/calendar/v3/calendars',
            data: {
                summary: input.summary,
                ...(input.description && { description: input.description }),
                ...(input.timeZone && { timeZone: input.timeZone })
            },
            retries: 3
        };

        const response = await nango.post(config);

        return {
            kind: response.data.kind,
            etag: response.data.etag,
            id: response.data.id,
            summary: response.data.summary,
            timeZone: response.data.timeZone
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
