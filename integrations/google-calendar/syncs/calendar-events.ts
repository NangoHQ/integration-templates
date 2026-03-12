import { createSync } from 'nango';
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
    calendar_index: z.number(),
    next_page_token: z.string(),
    calendar_watermarks_json: z.string()
});

type CalendarEvent = z.infer<typeof CalendarEventSchema>;
type Checkpoint = z.infer<typeof CheckpointSchema>;
type Metadata = z.infer<typeof MetadataSchema>;

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
        const metadata = await nango.getMetadata<Metadata>();
        const checkpoint = (await nango.getCheckpoint()) as Checkpoint | null;
        const calendarsToSync = metadata?.calendarsToSync ?? ['primary'];
        const calendarWatermarks = parseCalendarWatermarks(checkpoint?.calendar_watermarks_json);
        const defaultUpdatedAfter = getDefaultUpdatedAfter(metadata);

        let calendarIndex = checkpoint?.calendar_index ?? 0;
        let nextPageToken = checkpoint?.next_page_token || undefined;

        while (calendarIndex < calendarsToSync.length) {
            const calendarId = calendarsToSync[calendarIndex]!;
            let updatedAfter = calendarWatermarks[calendarId] ?? defaultUpdatedAfter;

            while (true) {
                const params: Record<string, string> = {
                    updatedMin: updatedAfter,
                    orderBy: 'updated',
                    showDeleted: 'true'
                };

                if (metadata?.timeMin) {
                    params['timeMin'] = metadata.timeMin;
                }
                if (metadata?.timeMax) {
                    params['timeMax'] = metadata.timeMax;
                }
                if (metadata?.singleEvents !== undefined) {
                    params['singleEvents'] = String(metadata.singleEvents);
                }
                if (nextPageToken) {
                    params['pageToken'] = nextPageToken;
                }

                const response = await nango.get<{ items?: CalendarEvent[]; nextPageToken?: string }>({
                    // https://developers.google.com/calendar/api/v3/reference/events/list
                    endpoint: `/calendar/v3/calendars/${calendarId}/events`,
                    params,
                    retries: 3
                });

                const items = response.data.items ?? [];
                const records = items.map((event) => ({
                    ...event,
                    id: `${calendarId}_${event.id}`
                }));

                if (records.length > 0) {
                    const activeRecords = records.filter((event) => event.status !== 'cancelled');
                    const deletedRecords = records.filter((event) => event.status === 'cancelled');

                    if (activeRecords.length > 0) {
                        await nango.batchSave(activeRecords, 'CalendarEvent');
                    }

                    if (deletedRecords.length > 0) {
                        await nango.batchDelete(
                            deletedRecords.map((event) => ({ id: event.id })),
                            'CalendarEvent'
                        );
                    }

                    const lastRecord = records[records.length - 1];
                    if (lastRecord?.updated && lastRecord.updated > updatedAfter) {
                        updatedAfter = lastRecord.updated;
                    }
                }

                calendarWatermarks[calendarId] = updatedAfter;

                const savedNextPageToken = response.data.nextPageToken;
                if (savedNextPageToken) {
                    nextPageToken = savedNextPageToken;
                    await nango.saveCheckpoint({
                        calendar_index: calendarIndex,
                        next_page_token: nextPageToken,
                        calendar_watermarks_json: JSON.stringify(calendarWatermarks)
                    });
                    continue;
                }

                nextPageToken = undefined;
                break;
            }

            calendarIndex++;

            await nango.saveCheckpoint({
                calendar_index: calendarIndex < calendarsToSync.length ? calendarIndex : 0,
                next_page_token: '',
                calendar_watermarks_json: JSON.stringify(calendarWatermarks)
            });
        }
    }
});

function getDefaultUpdatedAfter(metadata: Metadata | undefined): string {
    if (metadata?.timeMin) {
        return metadata.timeMin;
    }

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    return oneMonthAgo.toISOString();
}

function parseCalendarWatermarks(calendarWatermarksJson: string | undefined): Record<string, string> {
    if (!calendarWatermarksJson) {
        return {};
    }

    try {
        const parsed = JSON.parse(calendarWatermarksJson) as Record<string, unknown>;

        return Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
    } catch {
        return {};
    }
}

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
