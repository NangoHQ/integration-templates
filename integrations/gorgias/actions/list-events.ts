import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const CreatedDatetimeInputSchema = z
    .object({
        gte: z.string().optional().describe('Return events created at or after this ISO8601 datetime.'),
        gt: z.string().optional().describe('Return events created after this ISO8601 datetime.'),
        lte: z.string().optional().describe('Return events created at or before this ISO8601 datetime.'),
        lt: z.string().optional().describe('Return events created before this ISO8601 datetime.')
    })
    .optional()
    .describe('Filter events by their creation datetime using comparators.');

const InputSchema = z
    .object({
        cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
        limit: z.number().optional().describe('Maximum number of events to return per page. Defaults to 30, maximum is 100.'),
        object_id: z.number().optional().describe('Filter events by the ID of the object they relate to.'),
        object_type: z.string().optional().describe('Filter events by the type of object they relate to. Example: "Ticket", "Customer", "User".'),
        order_by: z.string().optional().describe('Sort order for the results. Example: "created_datetime:desc".'),
        types: z.array(z.string()).optional().describe('Filter events by specific event types. Example: ["ticket-created", "ticket-closed"].'),
        user_ids: z
            .array(z.number())
            .max(1)
            .optional()
            .describe('Filter events by the ID of the user who performed the actions. The API only supports a single element.'),
        created_datetime: CreatedDatetimeInputSchema
    })
    .describe('Input for listing Gorgias audit-trail events.');

const EventSchema = z.object({
    id: z.number().describe('Unique ID of the event.'),
    context: z.string().nullable().optional().describe('UUID that groups related events together.'),
    created_datetime: z.string().describe('ISO8601 timestamp when the event was created.'),
    data: z.record(z.string(), z.unknown()).nullable().optional().describe('Key-value data associated with the event.'),
    object_id: z.number().optional().describe('ID of the Gorgias object associated with the event.'),
    object_type: z.string().optional().describe('Type of the Gorgias object associated with the event. Example: "Ticket".'),
    type: z.string().describe('Type of the event. Example: "ticket-closed".'),
    user_id: z.number().nullable().optional().describe('ID of the user who triggered the event. Null if triggered automatically.'),
    uri: z.string().optional().describe('URI of the event resource.')
});

const OutputSchema = z
    .object({
        events: z.array(EventSchema).describe('List of events matching the filters.'),
        next_cursor: z.string().optional().describe('Cursor to fetch the next page. Omitted if there are no more pages.')
    })
    .describe('Output for listing Gorgias audit-trail events.');

/**
 * @tags: [read]
 * @tagReason: Reads audit-trail events from the Gorgias API without mutating any data.
 * @pitfalls: user_ids accepts an array but the API only supports a single element (maxItems: 1). object_type values are case-sensitive and must match the API enum exactly (e.g., "Ticket", not "ticket").
 */
const action = createAction({
    description: 'List account audit-trail events, filterable by object type/ID, event types, user, and creation-date range.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number | string[] | number[]> = {
            ...(input.cursor !== undefined && { cursor: input.cursor }),
            ...(input.limit !== undefined && { limit: input.limit }),
            ...(input.object_id !== undefined && { object_id: input.object_id }),
            ...(input.object_type !== undefined && { object_type: input.object_type }),
            ...(input.order_by !== undefined && { order_by: input.order_by }),
            ...(input.types !== undefined && input.types.length > 0 && { types: input.types }),
            ...(input.user_ids !== undefined && input.user_ids.length > 0 && { user_ids: input.user_ids })
        };

        if (input.created_datetime !== undefined) {
            if (input.created_datetime.gte !== undefined) {
                params['created_datetime[gte]'] = input.created_datetime.gte;
            }
            if (input.created_datetime.gt !== undefined) {
                params['created_datetime[gt]'] = input.created_datetime.gt;
            }
            if (input.created_datetime.lte !== undefined) {
                params['created_datetime[lte]'] = input.created_datetime.lte;
            }
            if (input.created_datetime.lt !== undefined) {
                params['created_datetime[lt]'] = input.created_datetime.lt;
            }
        }

        const config: ProxyConfiguration = {
            // https://developers.gorgias.com/reference/list-events
            endpoint: '/api/events',
            params,
            retries: 3
        };

        const response = await nango.get(config);

        const responseSchema = z.object({
            data: z.array(z.unknown()),
            meta: z
                .object({
                    prev_cursor: z.string().nullable().optional(),
                    next_cursor: z.string().nullable().optional()
                })
                .optional()
        });

        const parsed = responseSchema.parse(response.data);

        const events = parsed.data.map((item: unknown) => {
            const event = EventSchema.parse(item);
            return {
                id: event.id,
                ...(event.context !== undefined && event.context !== null && { context: event.context }),
                created_datetime: event.created_datetime,
                ...(event.data !== undefined && event.data !== null && { data: event.data }),
                ...(event.object_id !== undefined && { object_id: event.object_id }),
                ...(event.object_type !== undefined && { object_type: event.object_type }),
                type: event.type,
                ...(event.user_id !== undefined && event.user_id !== null && { user_id: event.user_id }),
                ...(event.uri !== undefined && { uri: event.uri })
            };
        });

        return {
            events,
            ...(parsed.meta?.next_cursor !== undefined && parsed.meta.next_cursor !== null && { next_cursor: parsed.meta.next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
