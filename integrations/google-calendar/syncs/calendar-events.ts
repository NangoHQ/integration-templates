import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CalendarEventSchema = z.object({
    id: z.string(),
    kind: z.string().optional(),
    etag: z.string().optional(),
    status: z.string().optional(),
    htmlLink: z.string().optional(),
    created: z.string().optional(),
    updated: z.string(),
    summary: z.string().optional(),
    description: z.string().optional(),
    location: z.string().optional(),
    creator: z
        .object({
            email: z.string().optional(),
            displayName: z.string().optional(),
            self: z.boolean().optional()
        })
        .optional(),
    organizer: z
        .object({
            email: z.string().optional(),
            displayName: z.string().optional(),
            self: z.boolean().optional()
        })
        .optional(),
    start: z
        .object({
            date: z.string().optional(),
            dateTime: z.string().optional(),
            timeZone: z.string().optional()
        })
        .optional(),
    end: z
        .object({
            date: z.string().optional(),
            dateTime: z.string().optional(),
            timeZone: z.string().optional()
        })
        .optional(),
    recurrence: z.array(z.string()).optional(),
    recurringEventId: z.string().optional(),
    originalStartTime: z
        .object({
            date: z.string().optional(),
            dateTime: z.string().optional(),
            timeZone: z.string().optional()
        })
        .optional(),
    transparency: z.string().optional(),
    visibility: z.string().optional(),
    iCalUID: z.string().optional(),
    sequence: z.number().optional(),
    attendees: z
        .array(
            z.object({
                email: z.string().optional(),
                displayName: z.string().optional(),
                responseStatus: z.string().optional()
            })
        )
        .optional(),
    attendeesOmitted: z.boolean().optional(),
    hangoutLink: z.string().optional(),
    conferenceData: z.any().optional(),
    reminders: z.any().optional(),
    attachments: z.any().optional(),
    eventType: z.string().optional()
});

const MetadataSchema = z.object({
    calendarsToSync: z.array(z.string()).optional().describe('Array of calendar IDs to sync. Defaults to ["primary"]'),
    timeMin: z.string().optional().describe('RFC3339 timestamp for lower bound on event start time. Also used as initial sync point if no checkpoint exists.'),
    timeMax: z.string().optional().describe('RFC3339 timestamp for upper bound on event end time'),
    singleEvents: z.boolean().optional().describe('Whether to expand recurring events into single instances')
});

const CheckpointSchema = z.object({
    updatedAfter: z.string()
});

type CalendarEvent = z.infer<typeof CalendarEventSchema>;

function parseOptional<T>(schema: z.ZodType<T>, value: unknown): T | undefined {
    const result = schema.safeParse(value);
    return result.success ? result.data : undefined;
}

function latestTimestamp(current: string, candidate?: string): string {
    if (!candidate) {
        return current;
    }

    return new Date(candidate).getTime() > new Date(current).getTime() ? candidate : current;
}

const sync = createSync({
    description: 'Incrementally sync full Google Calendar event objects, defaulting to the primary calendar with an initial one-month lookback',
    version: '1.0.0',
    endpoints: [{ method: 'POST', path: '/syncs/calendar-events' }],
    frequency: 'every 5 minutes',
    autoStart: true,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,

    models: {
        CalendarEvent: CalendarEventSchema
    },

    exec: async (nango) => {
        const metadata = parseOptional(MetadataSchema, await nango.getMetadata());
        const checkpoint = parseOptional(CheckpointSchema, await nango.getCheckpoint());
        const syncStartedAt = new Date().toISOString();

        const calendarsToSync = metadata?.calendarsToSync ?? ['primary'];
        let updatedAfter = checkpoint?.updatedAfter ?? '';

        if (!updatedAfter) {
            if (metadata?.['timeMin']) {
                updatedAfter = metadata['timeMin'];
            } else {
                const oneMonthAgo = new Date(syncStartedAt);
                oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
                updatedAfter = oneMonthAgo.toISOString();
            }
        }

        let maxUpdatedAfter = updatedAfter;

        for (const calendarId of calendarsToSync) {
            // https://developers.google.com/calendar/api/v3/reference/events/list
            const params: Record<string, string> = {
                updatedMin: updatedAfter,
                orderBy: 'updated',
                showDeleted: 'true'
            };

            // Add optional params
            if (metadata?.['timeMin']) {
                params['timeMin'] = metadata['timeMin'];
            }
            if (metadata?.['timeMax']) {
                params['timeMax'] = metadata['timeMax'];
            }
            if (metadata?.['singleEvents'] !== undefined) {
                params['singleEvents'] = String(metadata['singleEvents']);
            }

            const proxyConfig = {
                endpoint: `/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
                params,
                paginate: {
                    type: 'cursor',
                    cursor_path_in_response: 'nextPageToken',
                    cursor_name_in_request: 'pageToken',
                    response_path: 'items',
                    limit: 100
                },
                retries: 3
            } satisfies ProxyConfiguration;

            for await (const batch of nango.paginate(proxyConfig)) {
                const events = z.array(CalendarEventSchema).parse(batch);
                const records = events.map((event: CalendarEvent) => ({
                    ...event,
                    id: `${calendarId}_${event.id}`
                }));

                if (records.length > 0) {
                    const activeRecords = records.filter((r: CalendarEvent) => r.status !== 'cancelled');
                    const deletedRecords = records.filter((r: CalendarEvent) => r.status === 'cancelled');

                    if (activeRecords.length > 0) {
                        await nango.batchSave(activeRecords, 'CalendarEvent');
                    }

                    if (deletedRecords.length > 0) {
                        await nango.batchDelete(
                            deletedRecords.map((r: CalendarEvent) => ({ id: r.id })),
                            'CalendarEvent'
                        );
                    }

                    for (const record of records) {
                        maxUpdatedAfter = latestTimestamp(maxUpdatedAfter, record.updated);
                    }
                }
            }
        }

        await nango.saveCheckpoint({
            updatedAfter: latestTimestamp(maxUpdatedAfter, syncStartedAt)
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
