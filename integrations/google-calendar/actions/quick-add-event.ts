/**
 * Instructions: Creates an event based on a simple text string like a natural language input
 *
 * API Docs: https://developers.google.com/calendar/api/v3/reference/events/quickAdd
 */
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const QuickAddEventInput = z.object({
    calendar_id: z.string(),
    text: z.string()
});

const QuickAddEventOutput = z.object({
    kind: z.string(),
    etag: z.string(),
    id: z.string(),
    status: z.string(),
    summary: z.string(),
    start: z.any(),
    end: z.any()
});

const action = createAction({
    description: 'Creates an event based on a simple text string like a natural language input',
    version: '1.0.0',
    // https://developers.google.com/calendar/api/v3/reference/events/quickAdd
    endpoint: {
        method: 'POST',
        path: '/events/quickAdd',
        group: 'Events'
    },
    input: QuickAddEventInput,
    output: QuickAddEventOutput,
    scopes: ['https://www.googleapis.com/auth/calendar'],
    exec: async (nango, input): Promise<z.infer<typeof QuickAddEventOutput>> => {
        const config: ProxyConfiguration = {
            // https://developers.google.com/calendar/api/v3/reference/events/quickAdd
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(input.calendar_id)}/events/quickAdd`,
            params: {
                text: input.text
            },
            retries: 3
        };

        const response = await nango.post(config);

        return {
            kind: response.data.kind,
            etag: response.data.etag,
            id: response.data.id,
            status: response.data.status,
            summary: response.data.summary,
            start: response.data.start,
            end: response.data.end
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
