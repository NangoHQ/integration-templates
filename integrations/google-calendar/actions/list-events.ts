import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    calendarId: z.string().optional().describe('Calendar identifier. Use "primary" for the primary calendar or a calendar ID from calendarList.list.'),
    cursor: z.string().optional().describe('Pagination cursor (nextPageToken from previous response). Omit for first page.'),
    maxResults: z.number().optional().describe('Maximum number of events to return per page (1-2500, default 250).'),
    timeMin: z.string().optional().describe("Lower bound (exclusive) for an event's end time filter (RFC3339 timestamp)."),
    timeMax: z.string().optional().describe("Upper bound (exclusive) for an event's start time filter (RFC3339 timestamp)."),
    q: z.string().optional().describe('Free text search terms to find matching events.'),
    singleEvents: z.boolean().optional().describe('Whether to expand recurring events into single instances.'),
    showDeleted: z.boolean().optional().describe('Whether to include cancelled/deleted events.')
});

const EventSchema = z.object({
    id: z.string(),
    summary: z.string().optional(),
    description: z.string().optional(),
    location: z.string().optional(),
    start: z.union([z.object({ date: z.string() }), z.object({ dateTime: z.string(), timeZone: z.string().optional() })]).optional(),
    end: z.union([z.object({ date: z.string() }), z.object({ dateTime: z.string(), timeZone: z.string().optional() })]).optional(),
    status: z.string().optional(),
    created: z.string().optional(),
    updated: z.string().optional(),
    organizer: z.object({ email: z.string().optional(), displayName: z.string().optional() }).optional(),
    attendees: z
        .array(
            z.object({
                email: z.string().optional(),
                displayName: z.string().optional(),
                responseStatus: z.string().optional()
            })
        )
        .optional(),
    recurringEventId: z.string().optional(),
    transparency: z.string().optional(),
    visibility: z.string().optional()
});

const OutputSchema = z.object({
    events: z.array(EventSchema),
    nextPageToken: z.string().optional().describe('Pagination cursor for next page. Omitted if no more pages.')
});

const action = createAction({
    description: 'List events on a calendar',
    version: '2.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/list-events',
        group: 'Events'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const calendarId = input.calendarId || 'primary';

        const params: Record<string, any> = {};

        if (input.cursor) {
            params['pageToken'] = input.cursor;
        }

        if (input.maxResults !== undefined) {
            params['maxResults'] = input.maxResults;
        }

        if (input.timeMin) {
            params['timeMin'] = input.timeMin;
        }

        if (input.timeMax) {
            params['timeMax'] = input.timeMax;
        }

        if (input.q) {
            params['q'] = input.q;
        }

        if (input.singleEvents !== undefined) {
            params['singleEvents'] = input.singleEvents;
        }

        if (input.showDeleted !== undefined) {
            params['showDeleted'] = input.showDeleted;
        }

        // https://developers.google.com/workspace/calendar/api/v3/reference/events/list
        const response = await nango.get({
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
            params,
            retries: 3
        });

        const events = (response.data.items || []).map((event: any) => ({
            id: event.id,
            summary: event.summary ?? undefined,
            description: event.description ?? undefined,
            location: event.location ?? undefined,
            start: event.start || undefined,
            end: event.end || undefined,
            status: event.status ?? undefined,
            created: event.created ?? undefined,
            updated: event.updated ?? undefined,
            organizer: event.organizer || undefined,
            attendees: event.attendees,
            recurringEventId: event.recurringEventId ?? undefined,
            transparency: event.transparency ?? undefined,
            visibility: event.visibility ?? undefined
        }));

        return {
            events,
            nextPageToken: response.data.nextPageToken || undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
