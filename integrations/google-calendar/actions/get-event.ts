import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    calendarId: z.string().describe('Calendar identifier. Use "primary" for the primary calendar of the currently logged in user.'),
    eventId: z.string().describe('Event identifier.')
});

const OutputSchema = z.object({
    id: z.string(),
    summary: z.string().optional(),
    description: z.string().optional(),
    location: z.string().optional(),
    status: z.string().optional(),
    htmlLink: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    start: z
        .object({
            date: z.string().optional(),
            dateTime: z.string().optional(),
            timeZone: z.string().optional()
        })
        .optional(),
    end: z
        .object({
            date: z.string().optional(),
            dateTime: z.string().optional(),
            timeZone: z.string().optional()
        })
        .optional(),
    creator: z
        .object({
            id: z.string().optional(),
            email: z.string().optional(),
            displayName: z.string().optional(),
            self: z.boolean().optional()
        })
        .optional(),
    organizer: z
        .object({
            id: z.string().optional(),
            email: z.string().optional(),
            displayName: z.string().optional(),
            self: z.boolean().optional()
        })
        .optional()
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
            endpoint: `/calendar/v3/calendars/${input.calendarId}/events/${input.eventId}`,
            retries: 3
        });

        const event = response.data;

        return {
            id: event.id,
            summary: event.summary ?? undefined,
            description: event.description ?? undefined,
            location: event.location ?? undefined,
            status: event.status ?? undefined,
            htmlLink: event.htmlLink ?? undefined,
            createdAt: event.created ?? undefined,
            updatedAt: event.updated ?? undefined,
            start: event.start
                ? {
                      date: event.start.date ?? undefined,
                      dateTime: event.start.dateTime ?? undefined,
                      timeZone: event.start.timeZone ?? undefined
                  }
                : undefined,
            end: event.end
                ? {
                      date: event.end.date ?? undefined,
                      dateTime: event.end.dateTime ?? undefined,
                      timeZone: event.end.timeZone ?? undefined
                  }
                : undefined,
            creator: event.creator
                ? {
                      id: event.creator.id ?? undefined,
                      email: event.creator.email ?? undefined,
                      displayName: event.creator.displayName ?? undefined,
                      self: event.creator.self ?? false
                  }
                : undefined,
            organizer: event.organizer
                ? {
                      id: event.organizer.id ?? undefined,
                      email: event.organizer.email ?? undefined,
                      displayName: event.organizer.displayName ?? undefined,
                      self: event.organizer.self ?? false
                  }
                : undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
