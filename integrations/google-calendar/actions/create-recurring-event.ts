/**
 * Instructions: Creates a recurring event with RRULE specification
 *
 * API Docs: https://developers.google.com/calendar/api/v3/reference/events/insert
 */
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const CreateRecurringEventInput = z.object({
    calendar_id: z.string(),
    summary: z.string(),
    start: z.any(),
    end: z.any(),
    recurrence: z.array(z.string()),
    description: z.string().optional()
});

const CreateRecurringEventOutput = z.object({
    kind: z.string(),
    etag: z.string(),
    id: z.string(),
    summary: z.string(),
    recurrence: z.array(z.string())
});

const action = createAction({
    description: 'Creates a recurring event with RRULE specification',
    version: '1.0.0',
    // https://developers.google.com/calendar/api/v3/reference/events/insert
    endpoint: {
        method: 'POST',
        path: '/events/recurring',
        group: 'Events'
    },
    input: CreateRecurringEventInput,
    output: CreateRecurringEventOutput,
    scopes: ['https://www.googleapis.com/auth/calendar'],
    exec: async (nango, input): Promise<z.infer<typeof CreateRecurringEventOutput>> => {
        const config: ProxyConfiguration = {
            // https://developers.google.com/calendar/api/v3/reference/events/insert
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(input.calendar_id)}/events`,
            data: {
                summary: input.summary,
                start: input.start,
                end: input.end,
                recurrence: input.recurrence,
                ...(input.description && { description: input.description })
            },
            retries: 3
        };

        const response = await nango.post(config);

        return {
            kind: response.data.kind,
            etag: response.data.etag,
            id: response.data.id,
            summary: response.data.summary,
            recurrence: response.data.recurrence || []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
