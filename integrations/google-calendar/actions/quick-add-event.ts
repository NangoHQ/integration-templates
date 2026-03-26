import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    calendarId: z.string().optional().describe('Calendar identifier. Use "primary" for the primary calendar. Example: "primary"'),
    text: z.string().describe('The text describing the event to be created. Example: "Meeting with John tomorrow at 2pm"'),
    sendUpdates: z
        .enum(['all', 'externalOnly', 'none'])
        .optional()
        .describe('Guests who should receive notifications about the creation of the new event. Acceptable values: "all", "externalOnly", "none".')
});

const OutputSchema = z.object({
    id: z.string().describe('The unique ID of the event.'),
    summary: z.string().optional().describe('The title of the event.'),
    description: z.string().optional().describe('The description of the event.'),
    start: z
        .object({
            dateTime: z.string().optional(),
            date: z.string().optional(),
            timeZone: z.string().optional()
        })
        .describe('The start time of the event.'),
    end: z
        .object({
            dateTime: z.string().optional(),
            date: z.string().optional(),
            timeZone: z.string().optional()
        })
        .describe('The end time of the event.'),
    htmlLink: z.string().optional().describe('A link to the event in Google Calendar.'),
    created: z.string().optional().describe('The creation time of the event.'),
    updated: z.string().optional().describe('The last modification time of the event.'),
    status: z.string().optional().describe('The status of the event.'),
    creator: z
        .object({
            email: z.string().optional(),
            displayName: z.string().optional()
        })
        .optional()
        .describe('The creator of the event.'),
    organizer: z
        .object({
            email: z.string().optional(),
            displayName: z.string().optional()
        })
        .optional()
        .describe('The organizer of the event.')
});

const action = createAction({
    description: 'Create an event from a text string',
    version: '2.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/quick-add-event',
        group: 'Events'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar.events'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const calendarId = input.calendarId || 'primary';

        const response = await nango.post({
            // https://developers.google.com/calendar/api/v3/reference/events/quickAdd
            endpoint: `/calendar/v3/calendars/${calendarId}/events/quickAdd`,
            params: {
                text: input.text,
                ...(input.sendUpdates && { sendUpdates: input.sendUpdates })
            },
            retries: 3
        });

        const event = response.data;

        return {
            id: event.id,
            summary: event.summary ?? undefined,
            description: event.description ?? undefined,
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
            htmlLink: event.htmlLink ?? undefined,
            created: event.created ?? undefined,
            updated: event.updated ?? undefined,
            status: event.status ?? undefined,
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
                : undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
