import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderEventSchema = z.object({
    id: z.number(),
    context: z.string().nullable().optional(),
    created_datetime: z.string(),
    data: z.unknown().nullable().optional(),
    object_id: z.number().optional(),
    object_type: z.string().optional(),
    type: z.string().optional(),
    user_id: z.number().nullable().optional(),
    uri: z.string().optional()
});

const EventSchema = z
    .object({
        id: z.string().describe('Unique identifier of the event as a stable string'),
        context: z.string().optional().describe('UUID that groups related events in a causal chain'),
        created_datetime: z.string().describe('ISO8601 timestamp when the event was created'),
        data: z.unknown().optional().describe('Key-value data associated with the event'),
        object_id: z.number().optional().describe('ID of the Gorgias object associated with this event'),
        object_type: z.string().optional().describe('Type of the Gorgias object associated with this event'),
        type: z.string().optional().describe('Specific event type such as ticket-created or user-updated'),
        user_id: z.number().optional().describe('ID of the user who triggered the event, omitted when triggered automatically'),
        uri: z.string().optional().describe('API URI of the event resource')
    })
    .describe('An audit-trail event representing a lifecycle change in a Gorgias object');

const CheckpointSchema = z
    .object({
        created_after: z.string().describe('ISO8601 timestamp of the most recently processed event, used to filter subsequent runs')
    })
    .describe('Checkpoint state for incremental event syncing');

const sync = createSync({
    description: "Sync the account's audit-trail events (ticket/customer/user/tag/rule/etc. lifecycle events).",
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Event: EventSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let createdAfter: string | undefined;
        if (checkpoint != null) {
            const parsedCheckpoint = CheckpointSchema.safeParse(checkpoint);
            if (!parsedCheckpoint.success) {
                throw new Error(`Invalid checkpoint: ${parsedCheckpoint.error.message}`);
            }
            createdAfter = parsedCheckpoint.data.created_after;
        }

        const proxyConfig: ProxyConfiguration = {
            // https://developers.gorgias.com/reference/list-events
            endpoint: '/api/events',
            params: {
                order_by: 'created_datetime:asc',
                limit: 100,
                ...(createdAfter && { 'created_datetime[gte]': createdAfter })
            },
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'meta.next_cursor',
                cursor_name_in_request: 'cursor',
                response_path: 'data',
                limit_name_in_request: 'limit',
                limit: 100
            },
            retries: 3
        };

        let maxCreatedAfter: string | undefined = createdAfter;

        for await (const page of nango.paginate(proxyConfig)) {
            const validated = page.map((item) => {
                const result = ProviderEventSchema.safeParse(item);
                if (!result.success) {
                    throw new Error(`Invalid event record: ${result.error.message}`);
                }
                return result.data;
            });

            const events = validated.map((event) => {
                const mapped = {
                    id: String(event.id),
                    created_datetime: event.created_datetime,
                    ...(event.context != null && { context: event.context }),
                    ...(event.data != null && { data: event.data }),
                    ...(event.object_id != null && { object_id: event.object_id }),
                    ...(event.object_type != null && { object_type: event.object_type }),
                    ...(event.type != null && { type: event.type }),
                    ...(event.user_id != null && { user_id: event.user_id }),
                    ...(event.uri != null && { uri: event.uri })
                };

                return mapped;
            });

            if (events.length > 0) {
                await nango.batchSave(events, 'Event');

                const lastEvent = events[events.length - 1];
                if (lastEvent !== undefined && lastEvent.created_datetime != null) {
                    maxCreatedAfter = lastEvent.created_datetime;
                    await nango.saveCheckpoint({
                        created_after: maxCreatedAfter
                    });
                }
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
