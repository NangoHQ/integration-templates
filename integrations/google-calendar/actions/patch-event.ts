/**
 * Instructions: Partially updates an event with only provided fields
 *
 * API Docs: https://developers.google.com/calendar/api/v3/reference/events/patch
 */
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const PatchEventInput = z.object({
    calendar_id: z.string(),
    event_id: z.string(),
    summary: z.string().optional(),
    start: z.any().optional(),
    end: z.any().optional(),
    description: z.string().optional(),
    location: z.string().optional()
});

const PatchEventOutput = z.object({
    kind: z.string(),
    etag: z.string(),
    id: z.string(),
    status: z.string(),
    summary: z.string()
});

const action = createAction({
    description: 'Partially updates an event with only provided fields',
    version: '1.0.0',
    // https://developers.google.com/calendar/api/v3/reference/events/patch
    endpoint: {
        method: 'PATCH',
        path: '/event',
        group: 'Events'
    },
    input: PatchEventInput,
    output: PatchEventOutput,
    scopes: ['https://www.googleapis.com/auth/calendar'],
    exec: async (nango, input): Promise<z.infer<typeof PatchEventOutput>> => {
        const config: ProxyConfiguration = {
            // https://developers.google.com/calendar/api/v3/reference/events/patch
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(input.calendar_id)}/events/${encodeURIComponent(input.event_id)}`,
            data: {
                ...(input.summary && { summary: input.summary }),
                ...(input.start && { start: input.start }),
                ...(input.end && { end: input.end }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.location !== undefined && { location: input.location })
            },
            retries: 3
        };

        const response = await nango.patch(config);

        return {
            kind: response.data.kind,
            etag: response.data.etag,
            id: response.data.id,
            status: response.data.status,
            summary: response.data.summary
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
