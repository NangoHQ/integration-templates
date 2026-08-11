import { z } from 'zod';
import { createAction } from 'nango';

const EventTimeSchema = z.object({
    date: z.string().optional().describe('The date in yyyy-mm-dd format, if this is an all-day event.'),
    dateTime: z.string().optional().describe('The time as an RFC3339 formatted date-time value.'),
    timeZone: z.string().optional().describe('The time zone in which the time is specified.')
});

const EventPersonSchema = z.object({
    email: z.string().optional().describe('Email address of the person.'),
    displayName: z.string().optional().describe('Display name of the person.'),
    self: z.boolean().optional().describe('Whether this person corresponds to the calendar owner.')
});

const EventSchema = z.object({
    id: z.string().describe('Opaque identifier of the event.'),
    summary: z.string().optional().describe('Title of the event.'),
    description: z.string().optional().describe('Description of the event.'),
    location: z.string().optional().describe('Geographic location of the event.'),
    status: z.string().optional().describe('Status of the event. Possible values: confirmed, tentative, cancelled.'),
    htmlLink: z.string().optional().describe('Absolute link to this event in the Google Calendar Web UI.'),
    created: z.string().optional().describe('Creation time of the event as an RFC3339 timestamp.'),
    updated: z.string().optional().describe('Last modification time of the event as an RFC3339 timestamp.'),
    start: EventTimeSchema.optional().describe('The inclusive start time of the event.'),
    end: EventTimeSchema.optional().describe('The exclusive end time of the event.'),
    organizer: EventPersonSchema.optional().describe('Organizer of the event.'),
    creator: EventPersonSchema.optional().describe('Creator of the event.')
});

const ProviderEventTimeSchema = z.object({
    date: z.string().nullish(),
    dateTime: z.string().nullish(),
    timeZone: z.string().nullish()
});

const ProviderEventPersonSchema = z.object({
    email: z.string().nullish(),
    displayName: z.string().nullish(),
    self: z.boolean().nullish()
});

const ProviderEventSchema = z.object({
    id: z.string(),
    summary: z.string().nullish(),
    description: z.string().nullish(),
    location: z.string().nullish(),
    status: z.string().nullish(),
    htmlLink: z.string().nullish(),
    created: z.string().nullish(),
    updated: z.string().nullish(),
    start: ProviderEventTimeSchema.nullish(),
    end: ProviderEventTimeSchema.nullish(),
    organizer: ProviderEventPersonSchema.nullish(),
    creator: ProviderEventPersonSchema.nullish()
});

const ProviderListResponseSchema = z.object({
    items: z.array(z.unknown()).nullish(),
    nextPageToken: z.string().nullish()
});

const InputSchema = z
    .object({
        calendarId: z.string().optional().describe('Calendar identifier. Use "primary" for the primary calendar of the authenticated user.'),
        maxResults: z.number().int().min(1).max(2500).optional().describe('Maximum number of events returned on one result page. The API default is 250.'),
        timeMin: z.string().optional().describe("Lower bound (exclusive) for an event's end time as an RFC3339 timestamp."),
        timeMax: z.string().optional().describe("Upper bound (exclusive) for an event's start time as an RFC3339 timestamp."),
        cursor: z.string().optional().describe('Pagination cursor from the previous response. Maps to the provider pageToken. Omit for the first page.')
    })
    .describe('Input for listing events from a Google Calendar.');

const OutputSchema = z
    .object({
        events: z.array(EventSchema).describe('List of events on the calendar.'),
        nextPageToken: z.string().optional().describe('Token used to access the next page of results. Omitted when no further results are available.')
    })
    .describe('Output of listing events from a Google Calendar.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a list of events from the specified calendar without mutating any data.
 * @pitfalls: timeMin filters by an event's end time and timeMax filters by its start time, which is counterintuitive; recurring events are returned as single parent events rather than expanded instances.
 */
const action = createAction({
    description: 'List events on a calendar',
    version: '2.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const calendarId = input.calendarId ?? 'primary';

        const response = await nango.get({
            // https://developers.google.com/workspace/calendar/api/v3/reference/events/list
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
            params: {
                ...(input.maxResults !== undefined && { maxResults: String(input.maxResults) }),
                ...(input.timeMin !== undefined && { timeMin: input.timeMin }),
                ...(input.timeMax !== undefined && { timeMax: input.timeMax }),
                ...(input.cursor !== undefined && { pageToken: input.cursor })
            },
            retries: 3
        });

        const providerResponse = ProviderListResponseSchema.parse(response.data);

        const rawItems = providerResponse.items ?? [];

        const events = rawItems.map((rawItem) => {
            const providerEvent = ProviderEventSchema.parse(rawItem);

            return {
                id: providerEvent.id,
                ...(providerEvent.summary != null && { summary: providerEvent.summary }),
                ...(providerEvent.description != null && { description: providerEvent.description }),
                ...(providerEvent.location != null && { location: providerEvent.location }),
                ...(providerEvent.status != null && { status: providerEvent.status }),
                ...(providerEvent.htmlLink != null && { htmlLink: providerEvent.htmlLink }),
                ...(providerEvent.created != null && { created: providerEvent.created }),
                ...(providerEvent.updated != null && { updated: providerEvent.updated }),
                ...(providerEvent.start != null && {
                    start: {
                        ...(providerEvent.start.date != null && { date: providerEvent.start.date }),
                        ...(providerEvent.start.dateTime != null && { dateTime: providerEvent.start.dateTime }),
                        ...(providerEvent.start.timeZone != null && { timeZone: providerEvent.start.timeZone })
                    }
                }),
                ...(providerEvent.end != null && {
                    end: {
                        ...(providerEvent.end.date != null && { date: providerEvent.end.date }),
                        ...(providerEvent.end.dateTime != null && { dateTime: providerEvent.end.dateTime }),
                        ...(providerEvent.end.timeZone != null && { timeZone: providerEvent.end.timeZone })
                    }
                }),
                ...(providerEvent.organizer != null && {
                    organizer: {
                        ...(providerEvent.organizer.email != null && { email: providerEvent.organizer.email }),
                        ...(providerEvent.organizer.displayName != null && { displayName: providerEvent.organizer.displayName }),
                        ...(providerEvent.organizer.self != null && { self: providerEvent.organizer.self })
                    }
                }),
                ...(providerEvent.creator != null && {
                    creator: {
                        ...(providerEvent.creator.email != null && { email: providerEvent.creator.email }),
                        ...(providerEvent.creator.displayName != null && { displayName: providerEvent.creator.displayName }),
                        ...(providerEvent.creator.self != null && { self: providerEvent.creator.self })
                    }
                })
            };
        });

        return {
            events,
            ...(providerResponse.nextPageToken != null && { nextPageToken: providerResponse.nextPageToken })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
