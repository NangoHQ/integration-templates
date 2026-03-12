import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    calendar_id: z.string().optional().describe('Calendar ID. Defaults to "primary". Example: "primary"'),
    summary: z.string().describe('Event title/summary. Example: "Weekly Team Meeting"'),
    description: z.string().optional().describe('Event description. Example: "Discuss project progress"'),
    location: z.string().optional().describe('Event location. Example: "Conference Room A"'),
    start: z.string().describe('Event start time in RFC3339 format. Example: "2024-03-15T09:00:00-07:00"'),
    end: z.string().describe('Event end time in RFC3339 format. Example: "2024-03-15T10:00:00-07:00"'),
    rrule: z.string().describe('iCalendar RRULE for recurrence. Example: "FREQ=WEEKLY;BYDAY=MO,WE,FR"'),
    timezone: z.string().optional().describe('Timezone for the event. Defaults to "UTC". Example: "America/Los_Angeles"')
});

const OutputSchema = z.object({
    id: z.string(),
    html_link: z.string(),
    summary: z.string(),
    start: z.string(),
    end: z.string(),
    recurrence: z.array(z.string()).optional(),
    status: z.string()
});

const action = createAction({
    description: 'Create a recurring event with supplied start, end, and RRULE values',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/create-recurring-event',
        group: 'Events'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar.events'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const calendarId = input.calendar_id || 'primary';
        const timezone = input.timezone || 'UTC';

        // https://developers.google.com/calendar/api/v3/reference/events/insert
        const response = await nango.post({
            endpoint: `/calendar/v3/calendars/${calendarId}/events`,
            data: {
                summary: input.summary,
                description: input.description,
                location: input.location,
                start: {
                    dateTime: input.start,
                    timeZone: timezone
                },
                end: {
                    dateTime: input.end,
                    timeZone: timezone
                },
                recurrence: [`RRULE:${input.rrule}`]
            },
            retries: 10
        });

        const event = response.data;

        return {
            id: event.id,
            html_link: event.htmlLink,
            summary: event.summary,
            start: event.start?.dateTime || event.start?.date,
            end: event.end?.dateTime || event.end?.date,
            recurrence: event.recurrence,
            status: event.status
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
