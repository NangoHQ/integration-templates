import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    calendarId: z.string().optional().describe('Calendar identifier. Use "primary" for the primary calendar.'),
    summary: z.string().describe('Title of the event'),
    startDate: z.string().describe('Start date in yyyy-mm-dd format (inclusive)'),
    endDate: z.string().describe('End date in yyyy-mm-dd format (exclusive)'),
    description: z.string().optional().describe('Description of the event'),
    location: z.string().optional().describe('Location of the event')
});

const OutputSchema = z.object({
    id: z.string(),
    summary: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    description: z.string().optional(),
    location: z.string().optional(),
    htmlLink: z.string()
});

const action = createAction({
    description: 'Create an all-day calendar event using start and end dates',
    version: '2.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/create-all-day-event',
        group: 'Events'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar.events'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const calendarId = input.calendarId || 'primary';

        // https://developers.google.com/calendar/api/v3/reference/events/insert
        const response = await nango.post({
            endpoint: `/calendar/v3/calendars/${calendarId}/events`,
            data: {
                summary: input.summary,
                start: {
                    date: input.startDate
                },
                end: {
                    date: input.endDate
                },
                ...(input.description && { description: input.description }),
                ...(input.location && { location: input.location })
            },
            retries: 3
        });

        const event = response.data;

        return {
            id: event.id,
            summary: event.summary,
            startDate: event.start.date,
            endDate: event.end.date,
            description: event.description ?? undefined,
            location: event.location ?? undefined,
            htmlLink: event.htmlLink
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
