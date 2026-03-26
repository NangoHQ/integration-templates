import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    query: z
        .string()
        .describe('Free text search terms to find events. Searches in summary, description, location, attendee display names, and attendee emails.'),
    calendarId: z
        .string()
        .optional()
        .describe(
            'Calendar identifier. Use "primary" for the primary calendar. To retrieve calendar IDs, use the calendarList.list method. Defaults to "primary".'
        ),
    timeMin: z
        .string()
        .optional()
        .describe('Lower bound (inclusive) for an event\'s start time to filter by. RFC3339 timestamp format (e.g., "2024-01-01T00:00:00Z").'),
    timeMax: z
        .string()
        .optional()
        .describe('Upper bound (exclusive) for an event\'s end time to filter by. RFC3339 timestamp format (e.g., "2024-12-31T23:59:59Z").'),
    maxResults: z
        .number()
        .int()
        .min(1)
        .max(2500)
        .optional()
        .describe('Maximum number of events to return per page. Acceptable values are 1 to 2500. Defaults to 250.'),
    cursor: z.string().optional().describe('Pagination token from a previous response. Omit for the first page.')
});

const AttendeeSchema = z.object({
    id: z.string().optional(),
    email: z.string().optional(),
    displayName: z.string().optional(),
    responseStatus: z.string().optional(),
    optional: z.boolean().optional(),
    organizer: z.boolean().optional()
});

const EventSchema = z.object({
    id: z.string(),
    summary: z.string().optional(),
    description: z.string().optional(),
    location: z.string().optional(),
    htmlLink: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    status: z.string().optional(),
    organizerEmail: z.string().optional(),
    attendees: z.array(AttendeeSchema),
    recurringEventId: z.string().optional(),
    transparency: z.string().optional(),
    visibility: z.string().optional()
});

const OutputSchema = z.object({
    events: z.array(EventSchema),
    nextPageToken: z.string().optional().describe('Token for the next page of results. Omitted if no more pages.'),
    totalItems: z.number().int().describe('Total number of events in this page.')
});

const action = createAction({
    description: "Search a calendar's events by text query and optional time bounds",
    version: '2.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/search-events',
        group: 'Events'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: [
        'https://www.googleapis.com/auth/calendar.events.readonly',
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar'
    ],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const calendarId = input.calendarId || 'primary';
        const maxResults = input.maxResults || 250;

        // https://developers.google.com/calendar/api/v3/reference/events/list
        const config = {
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
            params: {
                q: input.query,
                maxResults: maxResults.toString(),
                ...(input.timeMin && { timeMin: input.timeMin }),
                ...(input.timeMax && { timeMax: input.timeMax }),
                ...(input.cursor && { pageToken: input.cursor }),
                singleEvents: 'true',
                orderBy: 'startTime'
            },
            retries: 3
        };

        const response = await nango.get(config);

        if (!response.data || !response.data.items) {
            return {
                events: [],
                nextPageToken: undefined,
                totalItems: 0
            };
        }

        const events = response.data.items.map((item: any) => {
            const attendees = item.attendees || [];

            return {
                id: item.id,
                summary: item.summary ?? undefined,
                description: item.description ?? undefined,
                location: item.location ?? undefined,
                htmlLink: item.htmlLink ?? undefined,
                createdAt: item.created ?? undefined,
                updatedAt: item.updated ?? undefined,
                startTime: item.start?.dateTime || item.start?.date || undefined,
                endTime: item.end?.dateTime || item.end?.date || undefined,
                status: item.status ?? undefined,
                organizerEmail: item.organizer?.email ?? undefined,
                attendees: attendees.map((attendee: any) => ({
                    id: attendee.id ?? undefined,
                    email: attendee.email ?? undefined,
                    displayName: attendee.displayName ?? undefined,
                    responseStatus: attendee.responseStatus ?? undefined,
                    optional: attendee.optional ?? false,
                    organizer: attendee.organizer ?? false
                })),
                recurringEventId: item.recurringEventId ?? undefined,
                transparency: item.transparency ?? undefined,
                visibility: item.visibility ?? undefined
            };
        });

        return {
            events,
            nextPageToken: response.data.nextPageToken || undefined,
            totalItems: events.length
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
