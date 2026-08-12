import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        calendarId: z.string().optional().describe('Calendar identifier. Use "primary" for the authenticated user\'s primary calendar. Defaults to "primary".'),
        summary: z.string().describe('Title of the event. Example: "Weekly Team Sync"'),
        description: z.string().optional().describe('Description of the event. Example: "Discuss project progress"'),
        location: z.string().optional().describe('Location of the event. Example: "Conference Room A"'),
        start: z.string().describe('Start time of the event in RFC 3339 format. Example: "2026-08-12T10:00:00-07:00"'),
        end: z.string().describe('End time of the event in RFC 3339 format. Example: "2026-08-12T11:00:00-07:00"'),
        rrule: z.string().describe('Recurrence rule in iCalendar RRULE format. Example: "FREQ=WEEKLY;BYDAY=MO,WE,FR"'),
        timezone: z.string().optional().describe('Time zone for the event start and end times. Example: "America/Los_Angeles". Defaults to UTC if omitted.')
    })
    .describe('Input to create a recurring Google Calendar event');

const ProviderDateTimeSchema = z.object({
    dateTime: z.string().optional(),
    date: z.string().optional(),
    timeZone: z.string().optional()
});

const ProviderEventSchema = z.object({
    id: z.string().optional(),
    summary: z.string().optional(),
    start: ProviderDateTimeSchema.optional(),
    end: ProviderDateTimeSchema.optional(),
    recurrence: z.array(z.string()).optional(),
    htmlLink: z.string().optional(),
    created: z.string().optional(),
    updated: z.string().optional(),
    status: z.string().optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the created event. Example: "abc123def456"'),
        htmlLink: z.string().describe('URL to view the event in Google Calendar.'),
        summary: z.string().describe('Title of the created event.'),
        start: z.string().describe('Start time of the event in RFC 3339 format.'),
        end: z.string().describe('End time of the event in RFC 3339 format.'),
        recurrence: z.array(z.string()).optional().describe('List of recurrence rules applied to the event. Example: ["RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR"]'),
        status: z.string().describe('Status of the event such as confirmed or tentative.')
    })
    .describe('The created recurring Google Calendar event');

/**
 * @tags: [write]
 * @tagReason: Inserts a new recurring event into the specified Google Calendar.
 * @pitfalls: The supplied rrule value must not include the "RRULE:" prefix because the action adds it automatically.
 */
const action = createAction({
    description: 'Create a recurring event with supplied start, end, and RRULE values',
    version: '2.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar.events'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const calendarId = input.calendarId || 'primary';
        const timezone = input.timezone || 'UTC';

        // https://developers.google.com/workspace/calendar/api/v3/reference/events/insert
        const response = await nango.post({
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
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
            retries: 3
        });

        const providerEvent = ProviderEventSchema.parse(response.data);

        const start = providerEvent.start?.dateTime || providerEvent.start?.date;
        const end = providerEvent.end?.dateTime || providerEvent.end?.date;

        if (!providerEvent.id || !providerEvent.htmlLink || !providerEvent.summary || !providerEvent.status || !start || !end) {
            throw new nango.ActionError({
                type: 'missing_fields',
                message: 'Created event response is missing required fields.'
            });
        }

        return {
            id: providerEvent.id,
            htmlLink: providerEvent.htmlLink,
            summary: providerEvent.summary,
            start,
            end,
            ...(providerEvent.recurrence != null && { recurrence: providerEvent.recurrence }),
            status: providerEvent.status
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
