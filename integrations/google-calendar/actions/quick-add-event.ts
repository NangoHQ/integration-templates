import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    calendar_id: z.string().optional().describe('Calendar identifier. Use "primary" for the primary calendar. Example: "primary"'),
    text: z.string().describe('The text describing the event to be created. Example: "Meeting with John tomorrow at 2pm"'),
    send_updates: z
        .enum(['all', 'externalOnly', 'none'])
        .optional()
        .describe('Guests who should receive notifications about the creation of the new event. Acceptable values: "all", "externalOnly", "none".')
});

const OutputSchema = z.object({
    id: z.string().describe('The unique ID of the event.'),
    summary: z.union([z.string(), z.null()]).describe('The title of the event.'),
    description: z.union([z.string(), z.null()]).describe('The description of the event.'),
    start: z
        .object({
            dateTime: z.union([z.string(), z.null()]),
            date: z.union([z.string(), z.null()]),
            timeZone: z.union([z.string(), z.null()])
        })
        .describe('The start time of the event.'),
    end: z
        .object({
            dateTime: z.union([z.string(), z.null()]),
            date: z.union([z.string(), z.null()]),
            timeZone: z.union([z.string(), z.null()])
        })
        .describe('The end time of the event.'),
    htmlLink: z.union([z.string(), z.null()]).describe('A link to the event in Google Calendar.'),
    created: z.union([z.string(), z.null()]).describe('The creation time of the event.'),
    updated: z.union([z.string(), z.null()]).describe('The last modification time of the event.'),
    status: z.union([z.string(), z.null()]).describe('The status of the event.'),
    creator: z
        .object({
            email: z.union([z.string(), z.null()]),
            displayName: z.union([z.string(), z.null()])
        })
        .optional()
        .describe('The creator of the event.'),
    organizer: z
        .object({
            email: z.union([z.string(), z.null()]),
            displayName: z.union([z.string(), z.null()])
        })
        .optional()
        .describe('The organizer of the event.')
});

const action = createAction({
    description: 'Create an event from a text string',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/quick-add-event',
        group: 'Events'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar.events'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const calendarId = input.calendar_id || 'primary';

        const response = await nango.post({
            // https://developers.google.com/calendar/api/v3/reference/events/quickAdd
            endpoint: `/calendar/v3/calendars/${calendarId}/events/quickAdd`,
            params: {
                text: input.text,
                ...(input.send_updates && { sendUpdates: input.send_updates })
            },
            retries: 10
        });

        const event = response.data;

        return {
            id: event.id,
            summary: event.summary ?? null,
            description: event.description ?? null,
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
            htmlLink: event.htmlLink ?? null,
            created: event.created ?? null,
            updated: event.updated ?? null,
            status: event.status ?? null,
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
                : undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
