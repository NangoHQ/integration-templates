/**
 * Instructions: Imports an event as a private copy using iCalendar UID
 *
 * API Docs: https://developers.google.com/calendar/api/v3/reference/events/import
 */
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const ImportEventInput = z.object({
    calendar_id: z.string(),
    iCalUID: z.string(),
    start: z.any(),
    end: z.any(),
    summary: z.string().optional()
});

const ImportEventOutput = z.object({
    kind: z.string(),
    etag: z.string(),
    id: z.string(),
    iCalUID: z.string(),
    status: z.string()
});

const action = createAction({
    description: 'Imports an event as a private copy using iCalendar UID',
    version: '1.0.0',
    // https://developers.google.com/calendar/api/v3/reference/events/import
    endpoint: {
        method: 'POST',
        path: '/events/import',
        group: 'Events'
    },
    input: ImportEventInput,
    output: ImportEventOutput,
    scopes: ['https://www.googleapis.com/auth/calendar'],
    exec: async (nango, input): Promise<z.infer<typeof ImportEventOutput>> => {
        const config: ProxyConfiguration = {
            // https://developers.google.com/calendar/api/v3/reference/events/import
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(input.calendar_id)}/events/import`,
            data: {
                iCalUID: input.iCalUID,
                start: input.start,
                end: input.end,
                ...(input.summary && { summary: input.summary })
            },
            retries: 3
        };

        const response = await nango.post(config);

        return {
            kind: response.data.kind,
            etag: response.data.etag,
            id: response.data.id,
            iCalUID: response.data.iCalUID,
            status: response.data.status
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
