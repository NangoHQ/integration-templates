import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    calendar_id: z.string().describe('Calendar identifier. Use "primary" for the primary calendar of the logged-in user.'),
    event_id: z.string().describe('Recurring event identifier.'),
    max_attendees: z.number().int().optional().describe('Maximum number of attendees to include in the response.'),
    max_results: z.number().int().min(1).max(2500).optional().describe('Maximum number of events returned on one result page. Default is 250, max is 2500.'),
    original_start: z.string().optional().describe('The original start time of the instance in the result.'),
    cursor: z.string().optional().describe('Pagination token from a previous response (maps to pageToken).'),
    show_deleted: z.boolean().optional().describe('Whether to include deleted events in the result. Default is false.'),
    time_max: z.string().optional().describe("Upper bound (exclusive) for an event's start time to filter by. RFC3339 timestamp."),
    time_min: z.string().optional().describe("Lower bound (inclusive) for an event's end time to filter by. RFC3339 timestamp."),
    time_zone: z.string().optional().describe("Time zone used in the response. Default is the calendar's time zone.")
});

const EventSchema = z.any().describe('A calendar event instance');

const OutputSchema = z.object({
    items: z.array(EventSchema).describe('List of event instances.'),
    next_cursor: z.union([z.string(), z.null()]).describe('Pagination token for the next page of results.'),
    kind: z.union([z.string(), z.null()]).optional(),
    etag: z.union([z.string(), z.null()]).optional(),
    summary: z.union([z.string(), z.null()]).optional(),
    description: z.union([z.string(), z.null()]).optional(),
    updated: z.union([z.string(), z.null()]).optional(),
    time_zone: z.union([z.string(), z.null()]).optional(),
    access_role: z.union([z.string(), z.null()]).optional(),
    next_sync_token: z.union([z.string(), z.null()]).optional()
});

const action = createAction({
    description: 'List instances of a recurring event',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/actions/list-event-instances',
        group: 'Events'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/calendar/api/v3/reference/events/instances
        const response = await nango.get({
            endpoint: `/calendar/v3/calendars/${input.calendar_id}/events/${input.event_id}/instances`,
            params: {
                ...(input.max_attendees && { maxAttendees: input.max_attendees }),
                ...(input.max_results && { maxResults: input.max_results }),
                ...(input.original_start && { originalStart: input.original_start }),
                ...(input.cursor && { pageToken: input.cursor }),
                ...(input.show_deleted !== undefined && { showDeleted: String(input.show_deleted) }),
                ...(input.time_max && { timeMax: input.time_max }),
                ...(input.time_min && { timeMin: input.time_min }),
                ...(input.time_zone && { timeZone: input.time_zone })
            },
            retries: 3
        });

        return {
            items: response.data.items || [],
            next_cursor: response.data.nextPageToken || null,
            kind: response.data.kind ?? null,
            etag: response.data.etag ?? null,
            summary: response.data.summary ?? null,
            description: response.data.description ?? null,
            updated: response.data.updated ?? null,
            time_zone: response.data.timeZone ?? null,
            access_role: response.data.accessRole ?? null,
            next_sync_token: response.data.nextSyncToken ?? null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
