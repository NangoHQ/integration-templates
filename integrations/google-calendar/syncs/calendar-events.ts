import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const EventDateTimeSchema = z
    .object({
        date: z.string().optional().describe('The date, in YYYY-MM-DD format, if this is an all-day event.'),
        dateTime: z.string().optional().describe('The time, in RFC3339 format, if this is not an all-day event.'),
        timeZone: z.string().optional().describe('The time zone of the event start or end time.')
    })
    .describe('A date-time or date-only specification for a calendar event.');

const EventPersonSchema = z
    .object({
        email: z.string().optional().describe("The person's email address."),
        displayName: z.string().optional().describe("The person's display name."),
        self: z.boolean().optional().describe('Whether the person is the calendar owner.')
    })
    .describe('A person associated with a calendar event, such as a creator or organizer.');

const EventAttendeeSchema = z
    .object({
        email: z.string().optional().describe("The attendee's email address."),
        displayName: z.string().optional().describe("The attendee's display name."),
        organizer: z.boolean().optional().describe('Whether the attendee is the organizer of the event.'),
        self: z.boolean().optional().describe('Whether the attendee is the calendar owner.'),
        responseStatus: z.string().optional().describe("The attendee's response status (needsAction, declined, tentative, accepted)."),
        comment: z.string().optional().describe("The attendee's response comment."),
        additionalGuests: z.number().int().optional().describe('Number of additional guests the attendee is bringing.')
    })
    .describe('An attendee invited to a calendar event.');

const EventReminderSchema = z
    .object({
        method: z.string().optional().describe('The notification method (email, popup).'),
        minutes: z.number().int().optional().describe('Number of minutes before the event to trigger the reminder.')
    })
    .describe('A single reminder override for a calendar event.');

const EventAttachmentSchema = z
    .object({
        fileUrl: z.string().optional().describe('URL of the attachment.'),
        title: z.string().optional().describe('Title of the attachment.'),
        mimeType: z.string().optional().describe('MIME type of the attachment.'),
        iconLink: z.string().optional().describe('URL of the attachment icon.'),
        fileId: z.string().optional().describe('ID of the attached file in Google Drive.')
    })
    .describe('An attachment associated with a calendar event.');

const CalendarEventSchema = z
    .object({
        kind: z.string().optional().describe('Type of the resource, typically "calendar#event".'),
        etag: z.string().optional().describe('ETag of the resource for optimistic concurrency.'),
        id: z.string().describe('The unique identifier of the calendar event.'),
        status: z.string().optional().describe('Status of the event (confirmed, tentative, cancelled).'),
        htmlLink: z.string().optional().describe('An absolute URL to the event in the Google Calendar Web UI.'),
        created: z.string().optional().describe('Creation time of the event in RFC3339 format.'),
        updated: z.string().optional().describe('Last modification time of the event in RFC3339 format.'),
        summary: z.string().optional().describe('Title or summary of the event.'),
        description: z.string().optional().describe('Description of the event.'),
        location: z.string().optional().describe('Geographic location of the event.'),
        colorId: z.string().optional().describe('Color ID for the event.'),
        creator: EventPersonSchema.optional().describe('The creator of the event.'),
        organizer: EventPersonSchema.optional().describe('The organizer of the event.'),
        start: EventDateTimeSchema.optional().describe('The start time of the event.'),
        end: EventDateTimeSchema.optional().describe('The end time of the event.'),
        endTimeUnspecified: z.boolean().optional().describe('Whether the end time is unspecified.'),
        recurrence: z.array(z.string()).optional().describe('RRULE, EXRULE, RDATE and EXDATE lines for a recurring event.'),
        recurringEventId: z.string().optional().describe('For an instance of a recurring event, the ID of the recurring event.'),
        originalStartTime: EventDateTimeSchema.optional().describe('For an instance of a recurring event, the original start time.'),
        transparency: z.string().optional().describe('Transparency of the event (opaque, transparent).'),
        visibility: z.string().optional().describe('Visibility of the event (default, public, private, confidential).'),
        iCalUID: z.string().optional().describe('Event unique identifier in iCalendar format.'),
        sequence: z.number().int().optional().describe('Sequence number of the event for versioning.'),
        attendees: z.array(EventAttendeeSchema).optional().describe('The attendees of the event.'),
        attendeesOmitted: z.boolean().optional().describe('Whether attendees may have been omitted from the response.'),
        extendedProperties: z
            .object({
                private: z.record(z.string(), z.string()).optional().describe('Private extended properties as key-value pairs.'),
                shared: z.record(z.string(), z.string()).optional().describe('Shared extended properties as key-value pairs.')
            })
            .optional()
            .describe('Extended properties of the event.'),
        hangoutLink: z.string().optional().describe('A link to the Google Meet conference attached to this event.'),
        conferenceData: z.object({}).passthrough().optional().describe('Conference data with meeting solutions and entry points.'),
        gadget: z.object({}).passthrough().optional().describe('Gadget information if the event was created by a gadget.'),
        anyoneCanAddSelf: z.boolean().optional().describe('Whether anyone can invite themselves to the event.'),
        guestsCanInviteOthers: z.boolean().optional().describe('Whether guests can invite other attendees.'),
        guestsCanModify: z.boolean().optional().describe('Whether guests can modify the event.'),
        guestsCanSeeOtherGuests: z.boolean().optional().describe('Whether guests can see the names of other attendees.'),
        privateCopy: z.boolean().optional().describe('Whether this is a private copy of an event.'),
        locked: z.boolean().optional().describe('Whether the event is locked.'),
        reminders: z
            .object({
                useDefault: z.boolean().optional().describe('Whether to use the default reminders.'),
                overrides: z.array(EventReminderSchema).optional().describe('Custom reminder overrides.')
            })
            .optional()
            .describe('Reminders for the event.'),
        source: z
            .object({
                url: z.string().optional().describe('URL of the source.'),
                title: z.string().optional().describe('Title of the source.')
            })
            .optional()
            .describe('Source of the event if imported from elsewhere.'),
        workingLocationProperties: z.object({}).passthrough().optional().describe('Working location properties for the event.'),
        outOfOfficeProperties: z.object({}).passthrough().optional().describe('Out-of-office properties for the event.'),
        focusTimeProperties: z.object({}).passthrough().optional().describe('Focus time properties for the event.'),
        attachments: z.array(EventAttachmentSchema).optional().describe('File attachments for the event.'),
        eventType: z.string().optional().describe('Type of the event (default, outOfOffice, focusTime, workingLocation).')
    })
    .describe('A full Google Calendar event object.');

const MetadataSchema = z
    .object({
        calendarsToSync: z.array(z.string()).optional().describe('List of calendar IDs to sync. Defaults to ["primary"].'),
        timeMin: z.string().optional().describe("Lower bound (exclusive) for an event's end time to filter by, in RFC3339 format."),
        timeMax: z.string().optional().describe("Upper bound (exclusive) for an event's start time to filter by, in RFC3339 format."),
        singleEvents: z.boolean().optional().describe('Whether to expand recurring events into instances.')
    })
    .describe('Optional metadata to customize calendar event sync behavior.');

const CheckpointSchema = z
    .object({
        updated_after: z.string().describe('Timestamp of the last synced event update across all calendars.')
    })
    .describe('Checkpoint state for incremental calendar event syncing.');

const sync = createSync({
    description: 'Incrementally sync full Google Calendar event objects',
    version: '5.0.1',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    metadata: MetadataSchema,
    models: {
        CalendarEvent: CalendarEventSchema
    },

    exec: async (nango) => {
        const syncStartTime = new Date().toISOString();
        const checkpoint = await nango.getCheckpoint();
        const metadata = await nango.getMetadata();

        const calendarsToSync = metadata?.calendarsToSync ?? ['primary'];

        for (const calendarId of calendarsToSync) {
            const params: Record<string, string> = {
                showDeleted: 'true',
                orderBy: 'updated',
                maxResults: '250'
            };

            if (checkpoint !== null && checkpoint !== undefined && checkpoint['updated_after'] !== '') {
                params['updatedMin'] = String(checkpoint['updated_after']);
            } else {
                const defaultTimeMin = new Date();
                defaultTimeMin.setUTCDate(defaultTimeMin.getUTCDate() - 30);
                defaultTimeMin.setUTCHours(0, 0, 0, 0);
                params['timeMin'] = metadata?.timeMin ?? defaultTimeMin.toISOString();
            }

            if (metadata?.timeMax) {
                params['timeMax'] = metadata.timeMax;
            }

            if (metadata?.singleEvents !== undefined) {
                params['singleEvents'] = String(metadata.singleEvents);
            }

            const proxyConfig: ProxyConfiguration = {
                // https://developers.google.com/calendar/api/v3/reference/events/list
                endpoint: `/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
                params,
                paginate: {
                    type: 'cursor',
                    cursor_name_in_request: 'pageToken',
                    cursor_path_in_response: 'nextPageToken',
                    response_path: 'items',
                    limit_name_in_request: 'maxResults',
                    limit: 250
                },
                retries: 3
            };

            for await (const page of nango.paginate(proxyConfig)) {
                const upserts: z.infer<typeof CalendarEventSchema>[] = [];
                const deletions: { id: string }[] = [];

                for (const rawEvent of page) {
                    const parsed = CalendarEventSchema.safeParse(rawEvent);
                    if (!parsed.success) {
                        throw new Error(`Failed to parse event: ${parsed.error.message}`);
                    }

                    if (parsed.data.status === 'cancelled') {
                        deletions.push({ id: parsed.data.id });
                    } else {
                        upserts.push(parsed.data);
                    }
                }

                if (upserts.length > 0) {
                    await nango.batchSave(upserts, 'CalendarEvent');
                }

                if (deletions.length > 0) {
                    await nango.batchDelete(deletions, 'CalendarEvent');
                }
            }
        }

        await nango.saveCheckpoint({ updated_after: syncStartTime });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
