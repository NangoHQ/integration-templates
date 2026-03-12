import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    calendar_id: z.string().optional().describe('Calendar identifier. Use "primary" for the primary calendar or a calendar ID from calendarList.list.'),
    cursor: z.string().optional().describe('Pagination cursor (nextPageToken from previous response). Omit for first page.'),
    max_results: z.number().optional().describe('Maximum number of events to return per page (1-2500, default 250).'),
    time_min: z.string().optional().describe("Lower bound (exclusive) for an event's end time filter (RFC3339 timestamp)."),
    time_max: z.string().optional().describe("Upper bound (exclusive) for an event's start time filter (RFC3339 timestamp)."),
    q: z.string().optional().describe('Free text search terms to find matching events.'),
    single_events: z.boolean().optional().describe('Whether to expand recurring events into single instances.'),
    show_deleted: z.boolean().optional().describe('Whether to include cancelled/deleted events.')
});

const EventSchema = z.object({
    id: z.string(),
    summary: z.union([z.string(), z.null()]),
    description: z.union([z.string(), z.null()]),
    location: z.union([z.string(), z.null()]),
    start: z.union([z.object({ date: z.string() }), z.object({ dateTime: z.string(), timeZone: z.union([z.string(), z.null()]) }), z.null()]),
    end: z.union([z.object({ date: z.string() }), z.object({ dateTime: z.string(), timeZone: z.union([z.string(), z.null()]) }), z.null()]),
    status: z.union([z.string(), z.null()]),
    created: z.union([z.string(), z.null()]),
    updated: z.union([z.string(), z.null()]),
    organizer: z.union([z.object({ email: z.union([z.string(), z.null()]), displayName: z.union([z.string(), z.null()]) }), z.null()]),
    attendees: z
        .array(
            z.object({
                email: z.union([z.string(), z.null()]),
                displayName: z.union([z.string(), z.null()]),
                responseStatus: z.union([z.string(), z.null()])
            })
        )
        .optional(),
    recurringEventId: z.union([z.string(), z.null()]),
    transparency: z.union([z.string(), z.null()]),
    visibility: z.union([z.string(), z.null()])
});

const OutputSchema = z.object({
    events: z.array(EventSchema),
    next_cursor: z.union([z.string(), z.null()]).describe('Pagination cursor for next page. Null if no more pages.')
});

const action = createAction({
    description: 'List events on a calendar',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/list-events',
        group: 'Events'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const calendarId = input.calendar_id || 'primary';

        const params: Record<string, any> = {};

        if (input.cursor) {
            params['pageToken'] = input.cursor;
        }

        if (input.max_results !== undefined) {
            params['maxResults'] = input.max_results;
        }

        if (input.time_min) {
            params['timeMin'] = input.time_min;
        }

        if (input.time_max) {
            params['timeMax'] = input.time_max;
        }

        if (input.q) {
            params['q'] = input.q;
        }

        if (input.single_events !== undefined) {
            params['singleEvents'] = input.single_events;
        }

        if (input.show_deleted !== undefined) {
            params['showDeleted'] = input.show_deleted;
        }

        // https://developers.google.com/workspace/calendar/api/v3/reference/events/list
        const response = await nango.get({
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
            params,
            retries: 3
        });

        const events = (response.data.items || []).map((event: any) => ({
            id: event.id,
            summary: event.summary ?? null,
            description: event.description ?? null,
            location: event.location ?? null,
            start: event.start || null,
            end: event.end || null,
            status: event.status ?? null,
            created: event.created ?? null,
            updated: event.updated ?? null,
            organizer: event.organizer || null,
            attendees: event.attendees,
            recurringEventId: event.recurringEventId ?? null,
            transparency: event.transparency ?? null,
            visibility: event.visibility ?? null
        }));

        return {
            events,
            next_cursor: response.data.nextPageToken || null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
