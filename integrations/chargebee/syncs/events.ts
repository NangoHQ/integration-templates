import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderEventSchema = z.object({
    id: z.string(),
    occurred_at: z.number(),
    source: z.string().nullish(),
    user: z.string().nullish(),
    object: z.string().nullish(),
    event_type: z.string().nullish(),
    api_version: z.string().nullish(),
    webhook_status: z.string().nullish(),
    webhook_failure_reason: z.string().nullish(),
    content: z.record(z.string(), z.unknown()).nullish()
});

const ProviderEventWrapperSchema = z.object({
    event: ProviderEventSchema
});

const EventSchema = z.object({
    id: z.string(),
    occurred_at: z.number(),
    source: z.string().optional(),
    user: z.string().optional(),
    object_type: z.string().optional(),
    event_type: z.string().optional(),
    api_version: z.string().optional(),
    webhook_status: z.string().optional(),
    webhook_failure_reason: z.string().optional(),
    content: z.record(z.string(), z.unknown()).optional()
});

const CheckpointSchema = z.object({
    occurred_after: z.number(),
    offset: z.string()
});

const sync = createSync({
    description: 'Sync events incrementally using occurred_at + event ID cursor.',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Event: EventSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : { occurred_after: 0, offset: '' };

        const occurredAfter = checkpoint.occurred_after;
        let offset: string | undefined = checkpoint.offset !== '' ? checkpoint.offset : undefined;
        let lastOccurredAt = occurredAfter !== 0 ? occurredAfter : undefined;

        const proxyConfig: ProxyConfiguration = {
            // https://apidocs.chargebee.com/docs/api/events
            endpoint: '/api/v2/events',
            params: {
                sort_by: 'occurred_at[asc]',
                ...(occurredAfter !== 0 && { 'occurred_at[after]': occurredAfter }),
                ...(offset !== undefined && { offset })
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'offset',
                cursor_path_in_response: 'next_offset',
                response_path: 'list',
                limit_name_in_request: 'limit',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    offset = typeof nextPageParam === 'string' && nextPageParam !== '' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            if (!Array.isArray(page)) {
                throw new Error('Expected page to be an array of event wrappers');
            }

            const events = page.map((rawWrapper) => {
                const wrapper = ProviderEventWrapperSchema.parse(rawWrapper);
                const event = wrapper.event;
                return {
                    id: event.id,
                    occurred_at: event.occurred_at,
                    ...(event.source != null && { source: event.source }),
                    ...(event.user != null && { user: event.user }),
                    ...(event.object != null && { object_type: event.object }),
                    ...(event.event_type != null && { event_type: event.event_type }),
                    ...(event.api_version != null && { api_version: event.api_version }),
                    ...(event.webhook_status != null && { webhook_status: event.webhook_status }),
                    ...(event.webhook_failure_reason != null && { webhook_failure_reason: event.webhook_failure_reason }),
                    ...(event.content != null && { content: event.content })
                };
            });

            if (events.length === 0) {
                continue;
            }

            await nango.batchSave(events, 'Event');

            const lastEvent = events[events.length - 1];
            if (lastEvent !== undefined) {
                lastOccurredAt = lastEvent.occurred_at;
            }

            if (offset !== undefined) {
                await nango.saveCheckpoint({
                    occurred_after: lastOccurredAt ?? occurredAfter,
                    offset
                });
            }
        }

        await nango.saveCheckpoint({
            occurred_after: lastOccurredAt ?? occurredAfter,
            offset: ''
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
