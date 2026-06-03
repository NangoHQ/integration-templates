import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderEventSchema = z.object({
    id: z.string(),
    event: z.string(),
    distinct_id: z.string().optional(),
    properties: z.record(z.string(), z.unknown()).optional(),
    timestamp: z.string(),
    elements: z.array(z.unknown()).optional(),
    elements_chain: z.string().optional()
});

const EventSchema = z.object({
    id: z.string(),
    event: z.string(),
    distinct_id: z.string().optional(),
    properties: z.record(z.string(), z.unknown()).optional(),
    timestamp: z.string(),
    elements: z.array(z.unknown()).optional(),
    elements_chain: z.string().optional()
});

const CheckpointSchema = z.object({
    after: z.string(),
    before: z.string(),
    high_watermark: z.string()
});

function getLaterTimestamp(current: string | undefined, candidate: string | undefined): string | undefined {
    if (!candidate) {
        return current;
    }

    if (!current) {
        return candidate;
    }

    return Date.parse(candidate) > Date.parse(current) ? candidate : current;
}

function getBeforeCursor(nextPageParam: unknown): string | undefined {
    if (typeof nextPageParam !== 'string' || nextPageParam.length === 0) {
        return undefined;
    }

    const nextUrl = new URL(nextPageParam, 'https://example.com');
    const before = nextUrl.searchParams.get('before');

    return before && before.length > 0 ? before : undefined;
}

const MetadataSchema = z.object({
    project_id: z.string()
});

const sync = createSync({
    description: 'Sync events from PostHog.',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    scopes: ['query:read'],
    // https://posthog.com/docs/api/events
    endpoints: [
        {
            path: '/syncs/events',
            method: 'POST'
        }
    ],
    models: {
        Event: EventSchema
    },

    exec: async (nango) => {
        const metadata = await nango.getMetadata<z.infer<typeof MetadataSchema>>();
        if (!metadata?.project_id) {
            throw new Error('project_id is required in metadata');
        }

        // PostHog starts incremental windows with `after`, but paginates each
        // window backwards with `before` links. Keep both so failed runs can
        // resume without replaying the full window.
        const rawCheckpoint = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.safeParse(rawCheckpoint);
        const checkpoint = parsedCheckpoint.success ? parsedCheckpoint.data : { after: '', before: '', high_watermark: '' };
        const after = checkpoint.after;
        let before: string | undefined = checkpoint.before || undefined;
        let highWatermark: string | undefined = checkpoint.high_watermark || undefined;

        const proxyConfig: ProxyConfiguration = {
            // https://posthog.com/docs/api/events#get-api-projects-project_id-events
            endpoint: `/api/projects/${encodeURIComponent(metadata.project_id)}/events/`,
            params: {
                ...(after && { after }),
                ...(before && { before })
            },
            paginate: {
                type: 'link',
                link_path_in_response_body: 'next',
                response_path: 'results',
                limit_name_in_request: 'limit',
                limit: 2,
                on_page: async ({ nextPageParam, response }) => {
                    before = getBeforeCursor(nextPageParam) ?? getBeforeCursor(response.data?.['next']);
                }
            },
            retries: 3
        };

        let processedAnyPage = false;

        for await (const page of nango.paginate(proxyConfig)) {
            processedAnyPage = true;
            let pageHighWatermark: string | undefined;
            const events = page.map((record) => {
                const parseResult = ProviderEventSchema.safeParse(record);
                if (!parseResult.success) {
                    throw new Error(`Failed to parse event: ${parseResult.error.message}`);
                }
                const rec = parseResult.data;
                pageHighWatermark = getLaterTimestamp(pageHighWatermark, rec.timestamp);
                return {
                    id: rec.id,
                    event: rec.event,
                    ...(rec.distinct_id !== undefined && { distinct_id: rec.distinct_id }),
                    ...(rec.properties !== undefined && { properties: rec.properties }),
                    timestamp: rec.timestamp,
                    ...(rec.elements !== undefined && { elements: rec.elements }),
                    ...(rec.elements_chain !== undefined && { elements_chain: rec.elements_chain })
                };
            });

            if (events.length === 0) {
                continue;
            }

            await nango.batchSave(events, 'Event');
            highWatermark = getLaterTimestamp(highWatermark, pageHighWatermark);

            if (before) {
                await nango.saveCheckpoint({
                    after,
                    before,
                    high_watermark: highWatermark ?? ''
                });
                continue;
            }

            if (highWatermark) {
                await nango.saveCheckpoint({ after: highWatermark, before: '', high_watermark: '' });
            }
        }

        if (!processedAnyPage && checkpoint.before && checkpoint.high_watermark) {
            await nango.saveCheckpoint({ after: checkpoint.high_watermark, before: '', high_watermark: '' });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
