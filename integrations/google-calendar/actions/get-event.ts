import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    calendar_id: z.string().describe('Calendar identifier. Use "primary" for the primary calendar of the currently logged in user.'),
    event_id: z.string().describe('Event identifier.')
});

const OutputSchema = z.object({
    id: z.string(),
    summary: z.union([z.string(), z.null()]),
    description: z.union([z.string(), z.null()]),
    location: z.union([z.string(), z.null()]),
    status: z.union([z.string(), z.null()]),
    html_link: z.union([z.string(), z.null()]),
    created_at: z.union([z.string(), z.null()]),
    updated_at: z.union([z.string(), z.null()]),
    start: z.union([
        z.object({
            date: z.union([z.string(), z.null()]).optional(),
            date_time: z.union([z.string(), z.null()]).optional(),
            time_zone: z.union([z.string(), z.null()]).optional()
        }),
        z.null()
    ]),
    end: z.union([
        z.object({
            date: z.union([z.string(), z.null()]).optional(),
            date_time: z.union([z.string(), z.null()]).optional(),
            time_zone: z.union([z.string(), z.null()]).optional()
        }),
        z.null()
    ]),
    creator: z.union([
        z.object({
            id: z.union([z.string(), z.null()]).optional(),
            email: z.union([z.string(), z.null()]).optional(),
            display_name: z.union([z.string(), z.null()]).optional(),
            self: z.boolean().optional()
        }),
        z.null()
    ]),
    organizer: z.union([
        z.object({
            id: z.union([z.string(), z.null()]).optional(),
            email: z.union([z.string(), z.null()]).optional(),
            display_name: z.union([z.string(), z.null()]).optional(),
            self: z.boolean().optional()
        }),
        z.null()
    ])
});

const action = createAction({
    description: 'Get an event by ID from Google Calendar',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/actions/get-event',
        group: 'Events'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/calendar/api/v3/reference/events/get
        const response = await nango.get({
            endpoint: `/calendar/v3/calendars/${input.calendar_id}/events/${input.event_id}`,
            retries: 3
        });

        const event = response.data;

        return {
            id: event.id,
            summary: event.summary ?? null,
            description: event.description ?? null,
            location: event.location ?? null,
            status: event.status ?? null,
            html_link: event.htmlLink ?? null,
            created_at: event.created ?? null,
            updated_at: event.updated ?? null,
            start: event.start
                ? {
                      date: event.start.date ?? null,
                      date_time: event.start.dateTime ?? null,
                      time_zone: event.start.timeZone ?? null
                  }
                : null,
            end: event.end
                ? {
                      date: event.end.date ?? null,
                      date_time: event.end.dateTime ?? null,
                      time_zone: event.end.timeZone ?? null
                  }
                : null,
            creator: event.creator
                ? {
                      id: event.creator.id ?? null,
                      email: event.creator.email ?? null,
                      display_name: event.creator.displayName ?? null,
                      self: event.creator.self ?? false
                  }
                : null,
            organizer: event.organizer
                ? {
                      id: event.organizer.id ?? null,
                      email: event.organizer.email ?? null,
                      display_name: event.organizer.displayName ?? null,
                      self: event.organizer.self ?? false
                  }
                : null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
