import { createSync } from 'nango';
import { z } from 'zod';

const CalendarEventSchema = z
    .object({
        id: z.string(),
        kind: z.string().optional(),
        etag: z.string().optional(),
        status: z.string().optional(),
        htmlLink: z.string().optional(),
        created: z.string().optional(),
        updated: z.string().optional(),
        summary: z.string().optional(),
        description: z.string().optional(),
        location: z.string().optional(),
        colorId: z.string().optional(),
        creator: z.record(z.string(), z.unknown()).optional(),
        organizer: z.record(z.string(), z.unknown()).optional(),
        start: z.record(z.string(), z.unknown()).optional(),
        end: z.record(z.string(), z.unknown()).optional(),
        endTimeUnspecified: z.boolean().optional(),
        recurrence: z.array(z.string()).optional(),
        recurringEventId: z.string().optional(),
        originalStartTime: z.record(z.string(), z.unknown()).optional(),
        transparency: z.string().optional(),
        visibility: z.string().optional(),
        iCalUID: z.string().optional(),
        sequence: z.number().optional(),
        attendees: z.array(z.record(z.string(), z.unknown())).optional(),
        attendeesOmitted: z.boolean().optional(),
        extendedProperties: z.record(z.string(), z.unknown()).optional(),
        hangoutLink: z.string().optional(),
        conferenceData: z.record(z.string(), z.unknown()).optional(),
        gadget: z.record(z.string(), z.unknown()).optional(),
        anyoneCanAddSelf: z.boolean().optional(),
        guestsCanInviteOthers: z.boolean().optional(),
        guestsCanModify: z.boolean().optional(),
        guestsCanSeeOtherGuests: z.boolean().optional(),
        privateCopy: z.boolean().optional(),
        locked: z.boolean().optional(),
        reminders: z.record(z.string(), z.unknown()).optional(),
        source: z.record(z.string(), z.unknown()).optional(),
        workingLocationProperties: z.record(z.string(), z.unknown()).optional(),
        outOfOfficeProperties: z.record(z.string(), z.unknown()).optional(),
        focusTimeProperties: z.record(z.string(), z.unknown()).optional(),
        attachments: z.array(z.record(z.string(), z.unknown())).optional(),
        eventType: z.string().optional()
    })
    .passthrough();

const MetadataSchema = z.object({
    calendarsToSync: z.array(z.string()).optional().describe('Array of calendar IDs to sync. Defaults to ["primary"]'),
    timeMin: z.string().optional().describe('RFC3339 timestamp for lower bound on event start time. Also used as initial sync point if no checkpoint exists.'),
    timeMax: z.string().optional().describe('RFC3339 timestamp for upper bound on event end time'),
    singleEvents: z.boolean().optional().describe('Whether to expand recurring events into single instances')
});

const CheckpointSchema = z.object({
    syncToken: z.string(),
    calendarId: z.string(),
    pageToken: z.string()
});

const sync = createSync({
    description: 'Incrementally sync full Google Calendar event objects, defaulting to the primary calendar with an initial one-month lookback',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        CalendarEvent: CalendarEventSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/calendar-events'
        }
    ],

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);
        const meta = parsedMetadata.success ? parsedMetadata.data : {};

        const calendarsToSync = meta.calendarsToSync ?? ['primary'];
        const singleEvents = meta.singleEvents ?? true;

        const checkpoint = await nango.getCheckpoint();

        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        const defaultTimeMin = oneMonthAgo.toISOString();

        for (const calendarId of calendarsToSync) {
            let hasMore = true;
            let pageToken = checkpoint?.pageToken || '';
            let calendarSyncToken = checkpoint?.syncToken || '';

            if (checkpoint?.calendarId && checkpoint.calendarId !== calendarId) {
                pageToken = '';
                calendarSyncToken = '';
            }

            while (hasMore) {
                const params: Record<string, string> = {
                    maxResults: '250',
                    singleEvents: String(singleEvents)
                };

                if (calendarSyncToken) {
                    params['syncToken'] = calendarSyncToken;
                    params['showDeleted'] = 'true';
                } else {
                    const timeMin = meta.timeMin ?? defaultTimeMin;
                    const timeMax = meta.timeMax;

                    params['timeMin'] = timeMin;
                    if (timeMax) {
                        params['timeMax'] = timeMax;
                    }
                    if (singleEvents) {
                        params['orderBy'] = 'startTime';
                    }
                }

                if (pageToken) {
                    params['pageToken'] = pageToken;
                }

                // https://developers.google.com/workspace/calendar/api/v3/reference/events/list
                const response = await nango.get({
                    endpoint: `/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
                    params: params,
                    retries: 3
                });

                const data = z.record(z.string(), z.unknown()).parse(response.data);
                const items = data['items'];
                const events: Array<Record<string, unknown>> = [];
                if (Array.isArray(items)) {
                    for (const item of items) {
                        if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
                            const typedItem = z.record(z.string(), z.unknown()).safeParse(item);
                            if (typedItem.success) {
                                events.push(typedItem.data);
                            }
                        }
                    }
                }

                if (events.length > 0) {
                    const validEvents: Array<z.infer<typeof CalendarEventSchema>> = [];
                    const deletedEvents: Array<{ id: string }> = [];

                    for (const rawEvent of events) {
                        const statusValue = rawEvent['status'];
                        const eventIdValue = rawEvent['id'];
                        const status = typeof statusValue === 'string' ? statusValue : undefined;
                        const eventId = typeof eventIdValue === 'string' ? eventIdValue : undefined;

                        if (!eventId) {
                            continue;
                        }

                        if (status === 'cancelled') {
                            deletedEvents.push({ id: eventId });
                        } else {
                            const parsed = CalendarEventSchema.safeParse(rawEvent);
                            if (parsed.success) {
                                validEvents.push(parsed.data);
                            }
                        }
                    }

                    if (validEvents.length > 0) {
                        await nango.batchSave(validEvents, 'CalendarEvent');
                    }

                    if (deletedEvents.length > 0) {
                        await nango.batchDelete(deletedEvents, 'CalendarEvent');
                    }
                }

                const nextPageToken = data['nextPageToken'];
                if (typeof nextPageToken === 'string' && nextPageToken) {
                    pageToken = nextPageToken;
                    await nango.saveCheckpoint({
                        syncToken: calendarSyncToken,
                        calendarId: calendarId,
                        pageToken: pageToken
                    });
                } else {
                    const nextSyncToken = data['nextSyncToken'];
                    if (typeof nextSyncToken === 'string' && nextSyncToken) {
                        calendarSyncToken = nextSyncToken;
                        pageToken = '';
                        await nango.saveCheckpoint({
                            syncToken: calendarSyncToken,
                            calendarId: calendarId,
                            pageToken: ''
                        });
                    }
                    hasMore = false;
                }
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
