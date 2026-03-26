import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    calendarId: z.string().describe('Calendar identifier. Use "primary" for the primary calendar of the logged-in user.'),
    eventId: z.string().describe('Recurring event identifier.'),
    maxAttendees: z.number().int().optional().describe('Maximum number of attendees to include in the response.'),
    maxResults: z.number().int().min(1).max(2500).optional().describe('Maximum number of events returned on one result page. Default is 250, max is 2500.'),
    originalStart: z.string().optional().describe('The original start time of the instance in the result.'),
    cursor: z.string().optional().describe('Pagination token from a previous response (maps to pageToken).'),
    showDeleted: z.boolean().optional().describe('Whether to include deleted events in the result. Default is false.'),
    timeMax: z.string().optional().describe("Upper bound (exclusive) for an event's start time to filter by. RFC3339 timestamp."),
    timeMin: z.string().optional().describe("Lower bound (inclusive) for an event's end time to filter by. RFC3339 timestamp."),
    timeZone: z.string().optional().describe("Time zone used in the response. Default is the calendar's time zone.")
});

const EventSchema = z.any().describe('A calendar event instance');

const OutputSchema = z.object({
    items: z.array(EventSchema).describe('List of event instances.'),
    nextPageToken: z.string().optional().describe('Pagination token for the next page of results.'),
    kind: z.string().optional(),
    etag: z.string().optional(),
    summary: z.string().optional(),
    description: z.string().optional(),
    updated: z.string().optional(),
    timeZone: z.string().optional(),
    accessRole: z.string().optional(),
    nextSyncToken: z.string().optional()
});

const action = createAction({
    description: 'List instances of a recurring event',
    version: '2.0.0',

    endpoint: {
        method: 'GET',
        path: '/actions/get-event-instances',
        group: 'Events'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/calendar/api/v3/reference/events/instances
        const response = await nango.get({
            endpoint: `/calendar/v3/calendars/${input.calendarId}/events/${input.eventId}/instances`,
            params: {
                ...(input.maxAttendees && { maxAttendees: input.maxAttendees }),
                ...(input.maxResults && { maxResults: input.maxResults }),
                ...(input.originalStart && { originalStart: input.originalStart }),
                ...(input.cursor && { pageToken: input.cursor }),
                ...(input.showDeleted !== undefined && { showDeleted: String(input.showDeleted) }),
                ...(input.timeMax && { timeMax: input.timeMax }),
                ...(input.timeMin && { timeMin: input.timeMin }),
                ...(input.timeZone && { timeZone: input.timeZone })
            },
            retries: 3
        });

        return {
            items: response.data.items || [],
            nextPageToken: response.data.nextPageToken || undefined,
            kind: response.data.kind ?? undefined,
            etag: response.data.etag ?? undefined,
            summary: response.data.summary ?? undefined,
            description: response.data.description ?? undefined,
            updated: response.data.updated ?? undefined,
            timeZone: response.data.timeZone ?? undefined,
            accessRole: response.data.accessRole ?? undefined,
            nextSyncToken: response.data.nextSyncToken ?? undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
