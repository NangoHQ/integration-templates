import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderEventSchema = z.object({
    id: z.number(),
    id_str: z.string().nullish(),
    title: z.string().nullish(),
    text: z.string().nullish(),
    date_happened: z.number().nullish(),
    host: z.string().nullish(),
    tags: z.array(z.string()).nullish(),
    url: z.string().nullish(),
    alert_type: z.string().nullish(),
    priority: z.string().nullable().optional(),
    source_type_name: z.string().nullish(),
    device_name: z.string().nullish()
});

const CheckpointSchema = z.object({
    end_timestamp: z.number()
});

const EventSchema = z.object({
    id: z.string(),
    id_str: z.string().optional(),
    title: z.string().optional(),
    text: z.string().optional(),
    date_happened: z.number().optional(),
    host: z.string().optional(),
    tags: z.array(z.string()).optional(),
    url: z.string().optional(),
    alert_type: z.string().optional(),
    priority: z.string().optional(),
    source_type_name: z.string().optional(),
    device_name: z.string().optional()
});

const sync = createSync({
    description: 'Sync events (deployments, alerts, custom annotations) in a time window',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Event: EventSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const now = Math.floor(Date.now() / 1000);

        const windowStart =
            checkpoint !== null && typeof checkpoint === 'object' && 'end_timestamp' in checkpoint && typeof checkpoint.end_timestamp === 'number'
                ? checkpoint.end_timestamp
                : now - 30 * 24 * 60 * 60;
        const windowEnd = now;

        if (windowStart >= windowEnd) {
            return;
        }

        const proxyConfig: ProxyConfiguration = {
            // https://docs.datadoghq.com/api/latest/events/#get-a-list-of-events
            endpoint: 'v1/events',
            params: {
                start: windowStart,
                end: windowEnd,
                unaggregated: 'true'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 0,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 1000,
                response_path: 'events'
            },
            retries: 3
        };

        for await (const batch of nango.paginate(proxyConfig)) {
            const events = z.array(ProviderEventSchema).parse(batch);

            if (events.length === 0) {
                continue;
            }

            const mapped = events.map((event) => ({
                id: String(event.id),
                ...(event.id_str != null && { id_str: event.id_str }),
                ...(event.title != null && { title: event.title }),
                ...(event.text != null && { text: event.text }),
                ...(event.date_happened != null && { date_happened: event.date_happened }),
                ...(event.host != null && { host: event.host }),
                ...(event.tags != null && { tags: event.tags }),
                ...(event.url != null && { url: event.url }),
                ...(event.alert_type != null && { alert_type: event.alert_type }),
                ...(event.priority !== undefined && event.priority !== null && { priority: event.priority }),
                ...(event.source_type_name != null && { source_type_name: event.source_type_name }),
                ...(event.device_name != null && { device_name: event.device_name })
            }));

            await nango.batchSave(mapped, 'Event');
        }

        await nango.saveCheckpoint({ end_timestamp: windowEnd });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
