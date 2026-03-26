import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    calendarId: z.string().optional().describe('Calendar ID. Use "primary" for the main calendar or a specific calendar ID. Example: "primary"'),
    cursor: z.string().optional().describe('Pagination token from previous response. Omit for first page.'),
    limit: z.number().min(1).max(2500).optional().describe('Maximum number of events to return per page (1-2500). Default: 250'),
    timeMin: z.string().optional().describe('RFC3339 timestamp to fetch events from (e.g., "2026-03-12T00:00:00Z"). Defaults to current time if not provided.')
});

const EventSchema = z.object({
    id: z.string(),
    summary: z.string().optional().describe('Event title'),
    description: z.string().optional().describe('Event description'),
    location: z.string().optional().describe('Event location'),
    start: z
        .object({
            dateTime: z.string().optional(),
            date: z.string().optional(),
            timeZone: z.string().optional()
        })
        .describe('Start time'),
    end: z
        .object({
            dateTime: z.string().optional(),
            date: z.string().optional(),
            timeZone: z.string().optional()
        })
        .describe('End time'),
    status: z.string().describe('Event status (confirmed, tentative, cancelled)'),
    htmlLink: z.string().optional().describe('Link to event in Google Calendar'),
    created: z.string().optional().describe('When the event was created'),
    updated: z.string().optional().describe('When the event was last updated'),
    creator: z
        .object({
            email: z.string().optional(),
            displayName: z.string().optional()
        })
        .optional(),
    organizer: z
        .object({
            email: z.string().optional(),
            displayName: z.string().optional()
        })
        .optional(),
    attendees: z
        .array(
            z.object({
                email: z.string().optional(),
                displayName: z.string().optional(),
                responseStatus: z.string().optional()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    events: z.array(EventSchema).describe('List of upcoming events'),
    nextPageToken: z.string().optional().describe('Token for fetching the next page. Omitted if no more pages.')
});

const action = createAction({
    description: 'List upcoming events from now, ordered by start time',
    version: '2.0.0',

    endpoint: {
        method: 'GET',
        path: '/actions/list-upcoming-events',
        group: 'Events'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const calendarId = input.calendarId || 'primary';
        const timeMin = input.timeMin || new Date().toISOString();

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
                summary: event.summary ?? undefined,
                description: event.description ?? undefined,
                location: event.location ?? undefined,
                start: {
                    dateTime: event.start?.dateTime ?? undefined,
                    date: event.start?.date ?? undefined,
                    timeZone: event.start?.timeZone ?? undefined
                },
                end: {
                    dateTime: event.end?.dateTime ?? undefined,
                    date: event.end?.date ?? undefined,
                    timeZone: event.end?.timeZone ?? undefined
                },
                status: event.status,
                htmlLink: event.htmlLink ?? undefined,
                created: event.created ?? undefined,
                updated: event.updated ?? undefined,
                creator: event.creator
                    ? {
                          email: event.creator.email ?? undefined,
                          displayName: event.creator.displayName ?? undefined
                      }
                    : undefined,
                organizer: event.organizer
                    ? {
                          email: event.organizer.email ?? undefined,
                          displayName: event.organizer.displayName ?? undefined
                      }
                    : undefined,
                attendees: event.attendees?.map((attendee: any) => ({
                    email: attendee.email ?? undefined,
                    displayName: attendee.displayName ?? undefined,
                    responseStatus: attendee.responseStatus ?? undefined
                }))
            })),
            nextPageToken: response.data.nextPageToken || undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
