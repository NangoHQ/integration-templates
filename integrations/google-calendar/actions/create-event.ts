/**
 * Instructions: Creates a new event on a calendar
 *
 * API Docs: https://developers.google.com/calendar/api/v3/reference/events/insert
 */
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const CreateEventInput = z.object({
    calendar_id: z.string(),
    summary: z.string(),
    start: z.any(),
    end: z.any(),
    description: z.string().optional(),
    location: z.string().optional(),
    attendees: z.array(z.any()).optional(),
    reminders: z.any().optional()
});

const CreateEventOutput = z.object({
    kind: z.string(),
    etag: z.string(),
    id: z.string(),
    status: z.string(),
    htmlLink: z.string(),
    summary: z.string(),
    start: z.any(),
    end: z.any()
});

const action = createAction({
    description: 'Creates a new event on a calendar',
    version: '1.0.0',
    // https://developers.google.com/calendar/api/v3/reference/events/insert
    endpoint: {
        method: 'POST',
        path: '/event',
        group: 'Events'
    },
    input: CreateEventInput,
    output: CreateEventOutput,
    scopes: ['https://www.googleapis.com/auth/calendar'],
    exec: async (nango, input): Promise<z.infer<typeof CreateEventOutput>> => {
        const config: ProxyConfiguration = {
            // https://developers.google.com/calendar/api/v3/reference/events/insert
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(input.calendar_id)}/events`,
            data: {
                summary: input.summary,
                start: input.start,
                end: input.end,
                ...(input.description && { description: input.description }),
                ...(input.location && { location: input.location }),
                ...(input.attendees && { attendees: input.attendees }),
                ...(input.reminders && { reminders: input.reminders })
            },
            retries: 3
        };

        const response = await nango.post(config);

        return {
            kind: response.data.kind,
            etag: response.data.etag,
            id: response.data.id,
            status: response.data.status,
            htmlLink: response.data.htmlLink,
            summary: response.data.summary,
            start: response.data.start,
            end: response.data.end
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
