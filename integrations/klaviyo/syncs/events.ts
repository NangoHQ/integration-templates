import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const EventSchema = z.object({
    id: z.string(),
    datetime: z.string(),
    timestamp: z.number().optional(),
    uuid: z.string().optional(),
    event_properties: z.record(z.string(), z.unknown()).optional(),
    metric_id: z.string().optional(),
    metric_name: z.string().optional(),
    profile_id: z.string().optional(),
    profile_email: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const EventAttributesSchema = z.object({
    datetime: z.string(),
    timestamp: z.number().optional(),
    event_properties: z.record(z.string(), z.unknown()).optional(),
    uuid: z.string().optional()
});

const RelationshipDataSchema = z.object({
    type: z.string(),
    id: z.string()
});

const EventRelationshipsSchema = z.object({
    metric: z
        .object({
            data: RelationshipDataSchema
        })
        .optional(),
    profile: z
        .object({
            data: RelationshipDataSchema
        })
        .optional()
});

const EventDataSchema = z.object({
    type: z.literal('event'),
    id: z.string(),
    attributes: EventAttributesSchema,
    relationships: EventRelationshipsSchema.optional()
});

const IncludedItemSchema = z.object({
    type: z.string(),
    id: z.string(),
    attributes: z.record(z.string(), z.unknown()).optional()
});

const LinksSchema = z.object({
    next: z.string().optional().nullable(),
    self: z.string().optional(),
    prev: z.string().optional().nullable()
});

const EventsResponseSchema = z.object({
    data: z.array(EventDataSchema),
    included: z.array(IncludedItemSchema).optional(),
    links: LinksSchema.optional()
});

function extractPageCursor(nextLink: string | null | undefined): string | undefined {
    if (!nextLink) {
        return undefined;
    }
    // @allowTryCatch
    // URL parsing may throw on malformed links from the provider; returning undefined gracefully stops pagination.
    try {
        const url = new URL(nextLink, 'https://a.klaviyo.com');
        const cursor = url.searchParams.get('page[cursor]');
        return cursor ?? undefined;
    } catch {
        return undefined;
    }
}

const sync = createSync({
    description: 'Sync events.',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Event: EventSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let updatedAfter: string | undefined;

        if (checkpoint) {
            const parsedCheckpoint = CheckpointSchema.safeParse(checkpoint);
            if (!parsedCheckpoint.success) {
                throw new Error(`Invalid checkpoint: ${parsedCheckpoint.error.message}`);
            }
            updatedAfter = parsedCheckpoint.data.updated_after;
        }

        let pageCursor: string | undefined;
        let maxDatetime: string | undefined;
        let hasNextPage = true;

        while (hasNextPage) {
            const params: Record<string, string | number> = {
                include: 'metric,profile',
                sort: 'datetime',
                'page[size]': 5
            };

            if (updatedAfter) {
                params['filter'] = `greater-than(datetime,${updatedAfter})`;
            }

            if (pageCursor) {
                params['page[cursor]'] = pageCursor;
            }

            const proxyConfig: ProxyConfiguration = {
                // https://developers.klaviyo.com/en/reference/get_events
                endpoint: '/api/events',
                params,
                headers: {
                    revision: '2026-04-15'
                },
                retries: 3
            };

            const response = await nango.get(proxyConfig);
            const parsedResponse = EventsResponseSchema.safeParse(response.data);

            if (!parsedResponse.success) {
                throw new Error(`Failed to parse events response: ${parsedResponse.error.message}`);
            }

            const { data: events, included, links } = parsedResponse.data;
            const metricMap = new Map<string, string>();
            const profileMap = new Map<string, string>();

            if (included) {
                for (const item of included) {
                    if (item.type === 'metric' && item.attributes) {
                        const name = item.attributes['name'];
                        if (typeof name === 'string') {
                            metricMap.set(item.id, name);
                        }
                    } else if (item.type === 'profile' && item.attributes) {
                        const email = item.attributes['email'];
                        if (typeof email === 'string') {
                            profileMap.set(item.id, email);
                        }
                    }
                }
            }

            const records = events.map((event) => {
                const metricId = event.relationships?.metric?.data.id;
                const profileId = event.relationships?.profile?.data.id;
                const datetime = event.attributes.datetime;

                if (maxDatetime === undefined || datetime > maxDatetime) {
                    maxDatetime = datetime;
                }

                return {
                    id: event.id,
                    datetime,
                    ...(event.attributes.timestamp !== undefined && { timestamp: event.attributes.timestamp }),
                    ...(event.attributes.uuid !== undefined && { uuid: event.attributes.uuid }),
                    ...(event.attributes.event_properties !== undefined && { event_properties: event.attributes.event_properties }),
                    ...(metricId !== undefined && { metric_id: metricId }),
                    ...(metricId !== undefined && metricMap.has(metricId) && { metric_name: metricMap.get(metricId) }),
                    ...(profileId !== undefined && { profile_id: profileId }),
                    ...(profileId !== undefined && profileMap.has(profileId) && { profile_email: profileMap.get(profileId) })
                };
            });

            if (records.length > 0) {
                await nango.batchSave(records, 'Event');
            }

            pageCursor = extractPageCursor(links?.next);
            hasNextPage = Boolean(pageCursor);
        }

        if (maxDatetime !== undefined) {
            await nango.saveCheckpoint({ updated_after: maxDatetime });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
