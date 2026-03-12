import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    query: z
        .string()
        .describe('Free text search terms to find events. Searches in summary, description, location, attendee display names, and attendee emails.'),
    calendar_id: z
        .string()
        .optional()
        .describe(
            'Calendar identifier. Use "primary" for the primary calendar. To retrieve calendar IDs, use the calendarList.list method. Defaults to "primary".'
        ),
    time_min: z
        .string()
        .optional()
        .describe('Lower bound (inclusive) for an event\'s start time to filter by. RFC3339 timestamp format (e.g., "2024-01-01T00:00:00Z").'),
    time_max: z
        .string()
        .optional()
        .describe('Upper bound (exclusive) for an event\'s end time to filter by. RFC3339 timestamp format (e.g., "2024-12-31T23:59:59Z").'),
    max_results: z
        .number()
        .int()
        .min(1)
        .max(2500)
        .optional()
        .describe('Maximum number of events to return per page. Acceptable values are 1 to 2500. Defaults to 250.'),
    cursor: z.string().optional().describe('Pagination token from a previous response. Omit for the first page.')
});

const AttendeeSchema = z.object({
    id: z.union([z.string(), z.null()]).optional(),
    email: z.union([z.string(), z.null()]).optional(),
    display_name: z.union([z.string(), z.null()]).optional(),
    response_status: z.union([z.string(), z.null()]).optional(),
    optional: z.boolean().optional(),
    organizer: z.boolean().optional()
});

const EventSchema = z.object({
    id: z.string(),
    summary: z.union([z.string(), z.null()]),
    description: z.union([z.string(), z.null()]),
    location: z.union([z.string(), z.null()]),
    html_link: z.union([z.string(), z.null()]),
    created_at: z.union([z.string(), z.null()]),
    updated_at: z.union([z.string(), z.null()]),
    start_time: z.union([z.string(), z.null()]),
    end_time: z.union([z.string(), z.null()]),
    status: z.union([z.string(), z.null()]),
    organizer_email: z.union([z.string(), z.null()]),
    attendees: z.array(AttendeeSchema),
    recurring_event_id: z.union([z.string(), z.null()]),
    transparency: z.union([z.string(), z.null()]),
    visibility: z.union([z.string(), z.null()])
});

const OutputSchema = z.object({
    events: z.array(EventSchema),
    next_cursor: z.union([z.string(), z.null()]).describe('Token for the next page of results. Null if no more pages.'),
    total_items: z.number().int().describe('Total number of events in this page.')
});

const action = createAction({
    description: "Search a calendar's events by text query and optional time bounds",
    version: '1.0.0',

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
        const calendarId = input.calendar_id || 'primary';
        const maxResults = input.max_results || 250;

        // https://developers.google.com/calendar/api/v3/reference/events/list
        const config = {
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
            params: {
                q: input.query,
                maxResults: maxResults.toString(),
                ...(input.time_min && { timeMin: input.time_min }),
                ...(input.time_max && { timeMax: input.time_max }),
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
                next_cursor: null,
                total_items: 0
            };
        }

        const events = response.data.items.map((item: any) => {
            const attendees = item.attendees || [];

            return {
                id: item.id,
                summary: item.summary ?? null,
                description: item.description ?? null,
                location: item.location ?? null,
                html_link: item.htmlLink ?? null,
                created_at: item.created ?? null,
                updated_at: item.updated ?? null,
                start_time: item.start?.dateTime || item.start?.date || null,
                end_time: item.end?.dateTime || item.end?.date || null,
                status: item.status ?? null,
                organizer_email: item.organizer?.email ?? null,
                attendees: attendees.map((attendee: any) => ({
                    id: attendee.id ?? null,
                    email: attendee.email ?? null,
                    display_name: attendee.displayName ?? null,
                    response_status: attendee.responseStatus ?? null,
                    optional: attendee.optional ?? false,
                    organizer: attendee.organizer ?? false
                })),
                recurring_event_id: item.recurringEventId ?? null,
                transparency: item.transparency ?? null,
                visibility: item.visibility ?? null
            };
        });

        return {
            events,
            next_cursor: response.data.nextPageToken || null,
            total_items: events.length
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
