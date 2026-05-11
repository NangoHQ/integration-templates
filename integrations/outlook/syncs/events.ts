import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const DEFAULT_BACKFILL_MS = 30 * 24 * 60 * 60 * 1000;

const MetadataSchema = z.object({
    backfillPeriodMs: z.number().int().positive().optional()
});

const DateTimeTimeZoneSchema = z.object({
    dateTime: z.string(),
    timeZone: z.string()
});

const EventSchema = z.object({
    id: z.string(),
    subject: z.string().optional(),
    bodyPreview: z.string().optional(),
    start: DateTimeTimeZoneSchema.optional(),
    end: DateTimeTimeZoneSchema.optional(),
    location: z.string().optional(),
    isAllDay: z.boolean().optional(),
    isCancelled: z.boolean().optional(),
    isDraft: z.boolean().optional(),
    isOnlineMeeting: z.boolean().optional(),
    onlineMeetingProvider: z.string().optional(),
    importance: z.string().optional(),
    sensitivity: z.string().optional(),
    showAs: z.string().optional(),
    webLink: z.string().optional(),
    iCalUId: z.string().optional(),
    type: z.string().optional(),
    seriesMasterId: z.string().optional(),
    organizerEmail: z.string().optional(),
    organizerName: z.string().optional(),
    categories: z.array(z.string()).optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    originalStartTimeZone: z.string().optional(),
    originalEndTimeZone: z.string().optional(),
    hasAttachments: z.boolean().optional(),
    changeKey: z.string().optional()
});

const CheckpointSchema = z.object({
    cursorUrl: z.string(),
    backfillPeriodMs: z.number().int().positive(),
    windowStart: z.string(),
    windowEnd: z.string()
});

const ProviderEventSchema = z.object({
    id: z.string(),
    '@removed': z.object({ reason: z.string() }).optional(),
    subject: z.string().optional(),
    bodyPreview: z.string().optional(),
    start: DateTimeTimeZoneSchema.optional(),
    end: DateTimeTimeZoneSchema.optional(),
    location: z.object({ displayName: z.string().optional() }).optional(),
    isAllDay: z.boolean().optional(),
    isCancelled: z.boolean().optional(),
    isDraft: z.boolean().optional(),
    isOnlineMeeting: z.boolean().optional(),
    onlineMeetingProvider: z.string().optional(),
    importance: z.string().optional(),
    sensitivity: z.string().optional(),
    showAs: z.string().optional(),
    webLink: z.string().optional(),
    iCalUId: z.string().optional(),
    type: z.string().optional(),
    seriesMasterId: z.string().optional(),
    organizer: z
        .object({
            emailAddress: z.object({ address: z.string().optional(), name: z.string().optional() }).optional()
        })
        .optional(),
    categories: z.array(z.string()).optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    originalStartTimeZone: z.string().optional(),
    originalEndTimeZone: z.string().optional(),
    hasAttachments: z.boolean().optional(),
    changeKey: z.string().optional()
});

const DeltaPageSchema = z.object({
    value: z.array(z.any()).default([]),
    '@odata.nextLink': z.string().optional(),
    '@odata.deltaLink': z.string().optional()
});

const sync = createSync({
    description: 'Sync events in a bounded calendar view with delta tokens.',
    version: '3.0.0',
    endpoints: [{ method: 'POST', path: '/syncs/events' }],
    frequency: 'every 5 minutes',
    autoStart: true,
    metadata: MetadataSchema,
    models: {
        Event: EventSchema
    },
    checkpoint: CheckpointSchema,

    exec: async (nango) => {
        const connection = await nango.getConnection();
        const metadata = MetadataSchema.parse(connection.metadata ?? {});
        const checkpointRaw = await nango.getCheckpoint();
        const checkpoint = checkpointRaw ? CheckpointSchema.parse(checkpointRaw) : undefined;

        const now = new Date();
        const backfillMs = metadata?.backfillPeriodMs ?? DEFAULT_BACKFILL_MS;
        const shouldReuseCheckpoint = checkpoint?.backfillPeriodMs === backfillMs;
        const windowStart = shouldReuseCheckpoint ? checkpoint.windowStart : new Date(now.getTime() - backfillMs).toISOString();
        const windowEnd = shouldReuseCheckpoint ? checkpoint.windowEnd : now.toISOString();
        const hasSavedUrl = Boolean(shouldReuseCheckpoint && checkpoint.cursorUrl);

        const proxyConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/graph/api/event-delta
            endpoint: hasSavedUrl ? checkpoint!.cursorUrl : '/v1.0/me/calendarView/delta',
            headers: {
                Prefer: 'odata.maxpagesize=50'
            },
            ...(hasSavedUrl
                ? {}
                : {
                      params: {
                          startDateTime: windowStart,
                          endDateTime: windowEnd
                      }
                  }),
            paginate: {
                type: 'link',
                link_path_in_response_body: '@odata.nextLink'
            },
            retries: 3
        };

        for await (const rawPage of nango.paginate<any>(proxyConfig)) {
            const page = DeltaPageSchema.parse(rawPage);
            const events = page.value;
            const upserts: Array<z.infer<typeof EventSchema>> = [];
            const deletions: Array<{ id: string }> = [];

            for (const rawEvent of events) {
                const event = ProviderEventSchema.parse(rawEvent);

                if (event['@removed']?.reason === 'deleted') {
                    deletions.push({ id: event.id });
                    continue;
                }

                const mappedEvent: z.infer<typeof EventSchema> = {
                    id: event.id,
                    subject: event.subject,
                    bodyPreview: event.bodyPreview,
                    start: event.start,
                    end: event.end,
                    location: event.location?.displayName,
                    isAllDay: event.isAllDay,
                    isCancelled: event.isCancelled,
                    isDraft: event.isDraft,
                    isOnlineMeeting: event.isOnlineMeeting,
                    onlineMeetingProvider: event.onlineMeetingProvider,
                    importance: event.importance,
                    sensitivity: event.sensitivity,
                    showAs: event.showAs,
                    webLink: event.webLink,
                    iCalUId: event.iCalUId,
                    type: event.type,
                    seriesMasterId: event.seriesMasterId,
                    organizerEmail: event.organizer?.emailAddress?.address,
                    organizerName: event.organizer?.emailAddress?.name,
                    categories: event.categories,
                    createdDateTime: event.createdDateTime,
                    lastModifiedDateTime: event.lastModifiedDateTime,
                    originalStartTimeZone: event.originalStartTimeZone,
                    originalEndTimeZone: event.originalEndTimeZone,
                    hasAttachments: event.hasAttachments,
                    changeKey: event.changeKey
                };

                upserts.push(mappedEvent);
            }

            if (upserts.length > 0) {
                await nango.batchSave(upserts, 'Event');
            }

            if (deletions.length > 0) {
                await nango.batchDelete(deletions, 'Event');
            }

            const cursorUrl = page['@odata.nextLink'] ?? page['@odata.deltaLink'];

            if (cursorUrl) {
                await nango.saveCheckpoint({
                    cursorUrl,
                    backfillPeriodMs: backfillMs,
                    windowStart,
                    windowEnd
                });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync.exec>[0];
export default sync;
