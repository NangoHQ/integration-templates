import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    start: z.number().describe('Start of the time range, as a POSIX timestamp. Example: 1722470400'),
    end: z.number().describe('End of the time range, as a POSIX timestamp. Example: 1754006400'),
    cursor: z.string().optional().describe('Pagination cursor (zero-based page number) from the previous response. Omit for the first page.')
});

const ProviderEventSchema = z.object({
    // Datadog's `id` is a 64-bit integer that can exceed Number.MAX_SAFE_INTEGER, so it loses precision
    // once parsed as a JS number. `id_str` carries the exact same identifier as a string.
    id: z.number(),
    id_str: z.string().nullish(),
    title: z.string().nullish(),
    text: z.string().nullish(),
    date_happened: z.number().nullish(),
    device_name: z.string().nullish(),
    host: z.string().nullish(),
    priority: z.string().nullish(),
    tags: z.array(z.string()).nullish(),
    url: z.string().nullish(),
    resource: z.string().nullish(),
    alert_type: z.string().nullish()
});

const EventOutputSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    text: z.string().optional(),
    date_happened: z.number().optional(),
    device_name: z.string().optional(),
    host: z.string().optional(),
    priority: z.string().optional(),
    tags: z.array(z.string()).optional(),
    url: z.string().optional(),
    resource: z.string().optional(),
    alert_type: z.string().optional()
});

const OutputSchema = z.object({
    events: z.array(EventOutputSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List events (deployments, alerts, custom annotations) within a time range.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.cursor !== undefined && !/^\d+$/.test(input.cursor)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a non-negative integer page number'
            });
        }
        // v1/events pagination is zero-based (page 0 is the first page), matching syncs/events.ts.
        const page = input.cursor ? parseInt(input.cursor, 10) : 0;

        // https://docs.datadoghq.com/api/latest/events/#get-a-list-of-events
        const response = await nango.get({
            endpoint: 'v1/events',
            params: {
                start: String(input.start),
                end: String(input.end),
                page: String(page),
                // Without this, an event whose parent aggregate started outside [start, end] is omitted
                // even if the event itself falls within the requested window (matches syncs/events.ts).
                unaggregated: 'true'
            },
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object' || Array.isArray(response.data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Datadog events API'
            });
        }

        const rawEvents = 'events' in response.data && Array.isArray(response.data.events) ? response.data.events : [];

        const events = rawEvents.map((rawEvent: unknown) => {
            const parsed = ProviderEventSchema.safeParse(rawEvent);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'parse_error',
                    message: 'Failed to parse event from provider response'
                });
            }
            const event = parsed.data;
            return {
                // Prefer the exact string id; fall back to the (potentially imprecise) numeric id.
                id: event.id_str ?? String(event.id),
                ...(event.title != null && { title: event.title }),
                ...(event.text != null && { text: event.text }),
                ...(event.date_happened != null && { date_happened: event.date_happened }),
                ...(event.device_name != null && { device_name: event.device_name }),
                ...(event.host != null && { host: event.host }),
                ...(event.priority != null && { priority: event.priority }),
                ...(event.tags != null && { tags: event.tags }),
                ...(event.url != null && { url: event.url }),
                ...(event.resource != null && { resource: event.resource }),
                ...(event.alert_type != null && { alert_type: event.alert_type })
            };
        });

        const nextCursor = events.length > 0 ? String(page + 1) : undefined;

        return {
            events,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
