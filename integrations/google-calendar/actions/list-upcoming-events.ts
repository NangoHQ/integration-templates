import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    calendar_id: z.string().optional().describe('Calendar ID. Use "primary" for the main calendar or a specific calendar ID. Example: "primary"'),
    cursor: z.string().optional().describe('Pagination token from previous response. Omit for first page.'),
    limit: z.number().min(1).max(2500).optional().describe('Maximum number of events to return per page (1-2500). Default: 250'),
    time_min: z.string().optional().describe('RFC3339 timestamp to fetch events from (e.g., "2026-03-12T00:00:00Z"). Defaults to current time if not provided.')
});

const EventSchema = z.object({
    id: z.string(),
    summary: z.union([z.string(), z.null()]).describe('Event title'),
    description: z.union([z.string(), z.null()]).describe('Event description'),
    location: z.union([z.string(), z.null()]).describe('Event location'),
    start: z
        .object({
            dateTime: z.union([z.string(), z.null()]).optional(),
            date: z.union([z.string(), z.null()]).optional(),
            timeZone: z.union([z.string(), z.null()]).optional()
        })
        .describe('Start time'),
    end: z
        .object({
            dateTime: z.union([z.string(), z.null()]).optional(),
            date: z.union([z.string(), z.null()]).optional(),
            timeZone: z.union([z.string(), z.null()]).optional()
        })
        .describe('End time'),
    status: z.string().describe('Event status (confirmed, tentative, cancelled)'),
    htmlLink: z.union([z.string(), z.null()]).describe('Link to event in Google Calendar'),
    created: z.union([z.string(), z.null()]).describe('When the event was created'),
    updated: z.union([z.string(), z.null()]).describe('When the event was last updated'),
    creator: z
        .object({
            email: z.union([z.string(), z.null()]).optional(),
            displayName: z.union([z.string(), z.null()]).optional()
        })
        .optional(),
    organizer: z
        .object({
            email: z.union([z.string(), z.null()]).optional(),
            displayName: z.union([z.string(), z.null()]).optional()
        })
        .optional(),
    attendees: z
        .array(
            z.object({
                email: z.union([z.string(), z.null()]).optional(),
                displayName: z.union([z.string(), z.null()]).optional(),
                responseStatus: z.union([z.string(), z.null()]).optional()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    events: z.array(EventSchema).describe('List of upcoming events'),
    next_cursor: z.union([z.string(), z.null()]).describe('Token for fetching the next page. Null if no more pages.')
});

const action = createAction({
    description: 'List upcoming events from now, ordered by start time',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/actions/list-upcoming-events',
        group: 'Events'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const calendarId = input.calendar_id || 'primary';
        const timeMin = input.time_min || new Date().toISOString();

        // https://developers.google.com/calendar/api/v3/reference/events/list
        const response = await nango.get({
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
            params: {
                timeMin: timeMin,
                orderBy: 'startTime',
                singleEvents: 'true',
                maxResults: input.limit?.toString() || '250',
                ...(input.cursor && { pageToken: input.cursor })
            },
            retries: 3
        });

        const events = response.data.items || [];

        return {
            events: events.map((event: any) => ({
                id: event.id,
                summary: event.summary ?? null,
                description: event.description ?? null,
                location: event.location ?? null,
                start: {
                    dateTime: event.start?.dateTime ?? null,
                    date: event.start?.date ?? null,
                    timeZone: event.start?.timeZone ?? null
                },
                end: {
                    dateTime: event.end?.dateTime ?? null,
                    date: event.end?.date ?? null,
                    timeZone: event.end?.timeZone ?? null
                },
                status: event.status,
                htmlLink: event.htmlLink ?? null,
                created: event.created ?? null,
                updated: event.updated ?? null,
                creator: event.creator
                    ? {
                          email: event.creator.email ?? null,
                          displayName: event.creator.displayName ?? null
                      }
                    : undefined,
                organizer: event.organizer
                    ? {
                          email: event.organizer.email ?? null,
                          displayName: event.organizer.displayName ?? null
                      }
                    : undefined,
                attendees: event.attendees?.map((attendee: any) => ({
                    email: attendee.email ?? null,
                    displayName: attendee.displayName ?? null,
                    responseStatus: attendee.responseStatus ?? null
                }))
            })),
            next_cursor: response.data.nextPageToken || null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
