import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    start: z.number().describe('Start of the time range, as a POSIX timestamp. Example: 1722470400'),
    end: z.number().describe('End of the time range, as a POSIX timestamp. Example: 1754006400'),
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.')
});

const ProviderEventSchema = z.object({
    id: z.number(),
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
    events: z.array(ProviderEventSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List events (deployments, alerts, custom annotations) within a time range.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (Number.isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a positive integer page number'
            });
        }

        // https://docs.datadoghq.com/api/latest/events/#get-a-list-of-events
        const response = await nango.get({
            endpoint: 'v1/events',
            params: {
                start: String(input.start),
                end: String(input.end),
                page: String(page)
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
            return parsed.data;
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
