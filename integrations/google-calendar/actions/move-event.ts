import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    calendar_id: z.string().describe('Calendar identifier of the source calendar where the event currently is. Example: "primary"'),
    event_id: z.string().describe('Event identifier. Example: "abc123def456"'),
    destination_calendar_id: z
        .string()
        .describe('Calendar identifier of the target calendar where the event is to be moved to. Example: "secondary-calendar-id"'),
    send_updates: z
        .enum(['all', 'externalOnly', 'none'])
        .optional()
        .describe(
            'Guests who should receive notifications about the change of the event\'s organizer. Acceptable values: "all", "externalOnly", "none". Default: "none"'
        )
});

const OutputSchema = z.object({
    id: z.string(),
    summary: z.union([z.string(), z.null()]),
    description: z.union([z.string(), z.null()]),
    location: z.union([z.string(), z.null()]),
    start: z
        .object({
            date: z.union([z.string(), z.null()]),
            dateTime: z.union([z.string(), z.null()]),
            timeZone: z.union([z.string(), z.null()])
        })
        .passthrough(),
    end: z
        .object({
            date: z.union([z.string(), z.null()]),
            dateTime: z.union([z.string(), z.null()]),
            timeZone: z.union([z.string(), z.null()])
        })
        .passthrough(),
    organizer: z
        .object({
            email: z.union([z.string(), z.null()]),
            displayName: z.union([z.string(), z.null()])
        })
        .passthrough()
        .optional(),
    htmlLink: z.union([z.string(), z.null()]).optional(),
    created: z.union([z.string(), z.null()]).optional(),
    updated: z.union([z.string(), z.null()]).optional(),
    status: z.union([z.string(), z.null()]).optional()
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
            endpoint: `/calendar/v3/calendars/${input.calendar_id}/events/${input.event_id}/move`,
            params: {
                destination: input.destination_calendar_id,
                ...(input.send_updates && { sendUpdates: input.send_updates })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'move_failed',
                message: 'Failed to move event',
                calendar_id: input.calendar_id,
                event_id: input.event_id,
                destination_calendar_id: input.destination_calendar_id
            });
        }

        const event = response.data;

        return {
            id: event.id,
            summary: event.summary ?? null,
            description: event.description ?? null,
            location: event.location ?? null,
            start: {
                date: event.start?.date ?? null,
                dateTime: event.start?.dateTime ?? null,
                timeZone: event.start?.timeZone ?? null
            },
            end: {
                date: event.end?.date ?? null,
                dateTime: event.end?.dateTime ?? null,
                timeZone: event.end?.timeZone ?? null
            },
            organizer: event.organizer
                ? {
                      email: event.organizer.email ?? null,
                      displayName: event.organizer.displayName ?? null
                  }
                : undefined,
            htmlLink: event.htmlLink ?? null,
            created: event.created ?? null,
            updated: event.updated ?? null,
            status: event.status ?? null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
