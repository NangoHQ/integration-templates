/**
 * Instructions: Creates an all-day event on a calendar
 *
 * API Docs: https://developers.google.com/calendar/api/v3/reference/events/insert
 */
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const CreateAllDayEventInput = z.object({
    calendar_id: z.string(),
    summary: z.string(),
    start_date: z.string(),
    end_date: z.string(),
    description: z.string().optional()
});

const CreateAllDayEventOutput = z.object({
    kind: z.string(),
    etag: z.string(),
    id: z.string(),
    summary: z.string(),
    start: z.any(),
    end: z.any()
});

const action = createAction({
    description: 'Creates an all-day event on a calendar',
    version: '1.0.0',
    // https://developers.google.com/calendar/api/v3/reference/events/insert
    endpoint: {
        method: 'POST',
        path: '/events/allDay',
        group: 'Events'
    },
    input: CreateAllDayEventInput,
    output: CreateAllDayEventOutput,
    scopes: ['https://www.googleapis.com/auth/calendar'],
    exec: async (nango, input): Promise<z.infer<typeof CreateAllDayEventOutput>> => {
        const config: ProxyConfiguration = {
            // https://developers.google.com/calendar/api/v3/reference/events/insert
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(input.calendar_id)}/events`,
            data: {
                summary: input.summary,
                start: {
                    date: input.start_date
                },
                end: {
                    date: input.end_date
                },
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
            start: response.data.start,
            end: response.data.end
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
