import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    calendarId: z.string().describe('Calendar identifier of the source calendar where the event currently is. Example: "primary"'),
    eventId: z.string().describe('Event identifier. Example: "abc123def456"'),
    destinationCalendarId: z
        .string()
        .describe('Calendar identifier of the target calendar where the event is to be moved to. Example: "secondary-calendar-id"'),
    sendUpdates: z
        .enum(['all', 'externalOnly', 'none'])
        .optional()
        .describe(
            'Guests who should receive notifications about the change of the event\'s organizer. Acceptable values: "all", "externalOnly", "none". Default: "none"'
        )
});

const OutputSchema = z.object({
    id: z.string(),
    summary: z.string().optional(),
    description: z.string().optional(),
    location: z.string().optional(),
    start: z
        .object({
            date: z.string().optional(),
            dateTime: z.string().optional(),
            timeZone: z.string().optional()
        })
        .passthrough(),
    end: z
        .object({
            date: z.string().optional(),
            dateTime: z.string().optional(),
            timeZone: z.string().optional()
        })
        .passthrough(),
    organizer: z
        .object({
            email: z.string().optional(),
            displayName: z.string().optional()
        })
        .passthrough()
        .optional(),
    htmlLink: z.string().optional(),
    created: z.string().optional(),
    updated: z.string().optional(),
    status: z.string().optional()
});

const action = createAction({
    description: 'Move an event to another calendar, changing its organizer',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/move-event',
        group: 'Events'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar.events'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/calendar/api/v3/reference/events/move
        const response = await nango.post({
            endpoint: `/calendar/v3/calendars/${input.calendarId}/events/${input.eventId}/move`,
            params: {
                destination: input.destinationCalendarId,
                ...(input.sendUpdates && { sendUpdates: input.sendUpdates })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'move_failed',
                message: 'Failed to move event',
                calendarId: input.calendarId,
                eventId: input.eventId,
                destinationCalendarId: input.destinationCalendarId
            });
        }

        const event = response.data;

        return {
            id: event.id,
            summary: event.summary ?? undefined,
            description: event.description ?? undefined,
            location: event.location ?? undefined,
            start: {
                date: event.start?.date ?? undefined,
                dateTime: event.start?.dateTime ?? undefined,
                timeZone: event.start?.timeZone ?? undefined
            },
            end: {
                date: event.end?.date ?? undefined,
                dateTime: event.end?.dateTime ?? undefined,
                timeZone: event.end?.timeZone ?? undefined
            },
            organizer: event.organizer
                ? {
                      email: event.organizer.email ?? undefined,
                      displayName: event.organizer.displayName ?? undefined
                  }
                : undefined,
            htmlLink: event.htmlLink ?? undefined,
            created: event.created ?? undefined,
            updated: event.updated ?? undefined,
            status: event.status ?? undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
