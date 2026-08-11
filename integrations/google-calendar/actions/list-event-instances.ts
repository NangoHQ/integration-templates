import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        calendar_id: z.string().describe('Calendar identifier. Use "primary" for the primary calendar of the authenticated user.'),
        event_id: z.string().describe('Recurring event identifier whose instances will be listed.'),
        cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
        max_results: z.number().int().optional().describe('Maximum number of events returned on one result page. Default is 250, maximum is 2500.'),
        show_deleted: z.boolean().optional().describe('Whether to include deleted (cancelled) events in the result. Default is false.'),
        time_min: z
            .string()
            .optional()
            .describe("Lower bound (inclusive) for an event's end time to filter by, as an RFC3339 timestamp with mandatory time zone offset."),
        time_max: z
            .string()
            .optional()
            .describe("Upper bound (exclusive) for an event's start time to filter by, as an RFC3339 timestamp with mandatory time zone offset."),
        time_zone: z.string().optional().describe('Time zone used in the response. Default is the time zone of the calendar.')
    })
    .describe('Input for listing instances of a recurring event');

const EventTimeSchema = z
    .object({
        date: z.string().optional().describe('The date in yyyy-mm-dd format if this is an all-day event.'),
        dateTime: z.string().optional().describe('The time as an RFC3339 formatted date-time value.'),
        timeZone: z.string().optional().describe('Time zone in which the time is specified, e.g. "Europe/Zurich".')
    })
    .passthrough();

const EventPersonSchema = z
    .object({
        id: z.string().optional().describe('Profile ID, if available.'),
        email: z.string().optional().describe('Email address, if available.'),
        displayName: z.string().optional().describe('Display name, if available.'),
        self: z.boolean().optional().describe('Whether this entry corresponds to the calendar on which this copy of the event appears.')
    })
    .passthrough();

const EventSchema = z
    .object({
        id: z.string().describe('Opaque identifier of the event.'),
        summary: z.string().optional().describe('Title of the event.'),
        description: z.string().optional().describe('Description of the event.'),
        location: z.string().optional().describe('Geographic location of the event as free-form text.'),
        start: EventTimeSchema.optional().describe('The inclusive start time of the event.'),
        end: EventTimeSchema.optional().describe('The exclusive end time of the event.'),
        status: z.string().optional().describe('Status of the event. Possible values: confirmed, tentative, cancelled.'),
        htmlLink: z.string().optional().describe('Absolute link to this event in the Google Calendar Web UI.'),
        created: z.string().optional().describe('Creation time of the event as an RFC3339 timestamp.'),
        updated: z.string().optional().describe('Last modification time of the event as an RFC3339 timestamp.'),
        organizer: EventPersonSchema.optional().describe('The organizer of the event.'),
        creator: EventPersonSchema.optional().describe('The creator of the event.'),
        recurringEventId: z.string().optional().describe('For an instance of a recurring event, the id of the recurring event to which this instance belongs.'),
        originalStartTime: EventTimeSchema.optional().describe('For an instance, the original scheduled start time before any modifications.'),
        iCalUID: z.string().optional().describe('Event unique identifier as defined in RFC5545.'),
        eventType: z
            .string()
            .optional()
            .describe('Specific type of the event. Possible values: default, birthday, focusTime, outOfOffice, workingLocation, fromGmail.'),
        transparency: z.string().optional().describe('Whether the event blocks time on the calendar. Possible values: opaque, transparent.'),
        visibility: z.string().optional().describe('Visibility of the event. Possible values: default, public, private, confidential.')
    })
    .passthrough();

const OutputSchema = z
    .object({
        items: z.array(EventSchema).describe('List of event instances for the specified recurring event.'),
        nextPageToken: z.string().optional().describe('Token for accessing the next page of results. Omitted when no further results are available.')
    })
    .describe('Output for listing instances of a recurring event');

/**
 * @tags: [read]
 * @tagReason: Reads existing event instances from the Google Calendar API.
 * @pitfalls: time_min filters by an event's end time (inclusive) while time_max filters by its start time (exclusive), which is the opposite of the parameter names; when show_deleted is true, cancelled instances may have only id, recurringEventId, and originalStartTime populated.
 */
const action = createAction({
    description: 'List instances of a recurring event',
    version: '2.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar.events.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/calendar/api/v3/reference/events/instances
        const response = await nango.get({
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(input.calendar_id)}/events/${encodeURIComponent(input.event_id)}/instances`,
            params: {
                ...(input.cursor !== undefined && { pageToken: input.cursor }),
                ...(input.max_results !== undefined && { maxResults: String(input.max_results) }),
                ...(input.show_deleted !== undefined && { showDeleted: String(input.show_deleted) }),
                ...(input.time_min !== undefined && { timeMin: input.time_min }),
                ...(input.time_max !== undefined && { timeMax: input.time_max }),
                ...(input.time_zone !== undefined && { timeZone: input.time_zone })
            },
            retries: 3
        });

        const rawData = response.data;
        if (!rawData || typeof rawData !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Google Calendar API.'
            });
        }

        const items = Array.isArray(rawData.items) ? rawData.items : [];
        const parsedItems = items.map((item: unknown) => EventSchema.parse(item));

        return {
            items: parsedItems,
            ...(rawData.nextPageToken != null && typeof rawData.nextPageToken === 'string' && { nextPageToken: rawData.nextPageToken })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
