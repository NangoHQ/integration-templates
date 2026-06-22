import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().optional().describe('Filter by event ID using the `is` operator.'),
    event_type: z.string().optional().describe('Filter by event type using the `is` operator.'),
    event_type_is_not: z.string().optional().describe('Filter by event type using the `is_not` operator.'),
    source: z.string().optional().describe('Filter by event source using the `is` operator.'),
    source_is_not: z.string().optional().describe('Filter by event source using the `is_not` operator.'),
    occurred_at_gt: z.number().optional().describe('Filter by occurred_at greater than (Unix seconds).'),
    occurred_at_lt: z.number().optional().describe('Filter by occurred_at less than (Unix seconds).'),
    occurred_at_gte: z.number().optional().describe('Filter by occurred_at greater than or equal to (Unix seconds).'),
    occurred_at_lte: z.number().optional().describe('Filter by occurred_at less than or equal to (Unix seconds).'),
    webhook_status: z.string().optional().describe('Filter by webhook status using the `is` operator.'),
    webhook_status_is_not: z.string().optional().describe('Filter by webhook status using the `is_not` operator.'),
    limit: z.number().min(1).max(100).optional().describe('Number of events to return (max 100).'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const EventSchema = z
    .object({
        id: z.string(),
        occurred_at: z.number(),
        source: z.string(),
        event_type: z.string().optional(),
        api_version: z.string().optional(),
        content: z.record(z.string(), z.unknown()).optional(),
        origin_user: z.string().optional(),
        user: z.string().optional(),
        webhooks: z.array(z.record(z.string(), z.unknown())).optional()
    })
    .catchall(z.unknown());

const ProviderResponseSchema = z.object({
    list: z.array(z.object({ event: EventSchema }).catchall(z.unknown())),
    next_offset: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(z.record(z.string(), z.unknown())),
    next_offset: z.string().optional().describe('Pagination cursor for the next page.')
});

const action = createAction({
    description: 'List webhook events with optional filters.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};

        if (input.id !== undefined) {
            params['id[is]'] = input.id;
        }
        if (input.event_type !== undefined) {
            params['event_type[is]'] = input.event_type;
        }
        if (input.event_type_is_not !== undefined) {
            params['event_type[is_not]'] = input.event_type_is_not;
        }
        if (input.source !== undefined) {
            params['source[is]'] = input.source;
        }
        if (input.source_is_not !== undefined) {
            params['source[is_not]'] = input.source_is_not;
        }
        if (input.occurred_at_gt !== undefined) {
            params['occurred_at[after]'] = input.occurred_at_gt;
        }
        if (input.occurred_at_lt !== undefined) {
            params['occurred_at[lt]'] = input.occurred_at_lt;
        }
        if (input.occurred_at_gte !== undefined) {
            params['occurred_at[gte]'] = input.occurred_at_gte;
        }
        if (input.occurred_at_lte !== undefined) {
            params['occurred_at[lte]'] = input.occurred_at_lte;
        }
        if (input.webhook_status !== undefined) {
            params['webhook_status[is]'] = input.webhook_status;
        }
        if (input.webhook_status_is_not !== undefined) {
            params['webhook_status[is_not]'] = input.webhook_status_is_not;
        }
        if (input.limit !== undefined) {
            params['limit'] = input.limit;
        }
        if (input.cursor !== undefined) {
            params['offset'] = input.cursor;
        }

        const response = await nango.get({
            // https://apidocs.chargebee.com/docs/api/events/list-events
            endpoint: '/api/v2/events',
            params,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            items: parsed.list.map((item) => item.event),
            ...(parsed.next_offset !== undefined && { next_offset: parsed.next_offset })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
