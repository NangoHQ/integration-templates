import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const EventDateTimeSchema = z.object({
    date: z.string().optional().describe('The date, in yyyy-mm-dd format, for all-day events.'),
    dateTime: z.string().optional().describe('The time as an RFC3339 combined date-time value.'),
    timeZone: z.string().optional().describe('The time zone, e.g. Europe/Zurich.')
});

const AttendeeSchema = z.object({
    email: z.string().optional().describe('The attendee email address.'),
    displayName: z.string().optional().describe('The attendee display name.'),
    responseStatus: z.string().optional().describe('The attendee response status.')
});

const InputSchema = z
    .object({
        calendarId: z.string().optional().describe('Calendar identifier. Defaults to "primary".'),
        iCalUID: z.string().describe('iCalendar UID for the event.'),
        start: EventDateTimeSchema.describe('Start time of the event.'),
        end: EventDateTimeSchema.describe('End time of the event.'),
        summary: z.string().optional().describe('Title of the event.'),
        description: z.string().optional().describe('Description of the event.'),
        location: z.string().optional().describe('Geographic location of the event.'),
        attendees: z.array(AttendeeSchema).optional().describe('Attendees of the event.')
    })
    .describe('Input for importing an event into a Google Calendar.');

const OutputSchema = z
    .object({
        id: z.string().describe('Identifier of the imported event.'),
        iCalUID: z.string().describe('iCalendar UID of the event.'),
        summary: z.string().optional().describe('Title of the event.'),
        start: EventDateTimeSchema.optional().describe('Start time of the event.'),
        end: EventDateTimeSchema.optional().describe('End time of the event.'),
        description: z.string().optional().describe('Description of the event.'),
        location: z.string().optional().describe('Geographic location of the event.'),
        status: z.string().optional().describe('Status of the event.')
    })
    .describe('Output of the imported Google Calendar event.');

/**
 * @tags: [write]
 * @tagReason: Imports a private copy of an event into the specified calendar.
 * @pitfalls: Only default-type events may be imported; non-default events are silently converted to default and event-type-specific properties are dropped.
 */
const action = createAction({
    description: 'Import an event as a private copy using an iCalendar UID.',
    version: '2.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar.events'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const calendarId = input.calendarId ?? 'primary';

        const body: Record<string, unknown> = {
            iCalUID: input.iCalUID,
            start: input.start,
            end: input.end,
            ...(input.summary !== undefined && { summary: input.summary }),
            ...(input.description !== undefined && { description: input.description }),
            ...(input.location !== undefined && { location: input.location }),
            ...(input.attendees !== undefined && { attendees: input.attendees })
        };

        const config: ProxyConfiguration = {
            // https://developers.google.com/workspace/calendar/api/v3/reference/events/import
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/import`,
            data: body,
            retries: 3
        };

        const response = await nango.post(config);

        const ProviderEventSchema = z.object({
            id: z.string(),
            iCalUID: z.string(),
            summary: z.string().optional(),
            start: EventDateTimeSchema.optional(),
            end: EventDateTimeSchema.optional(),
            description: z.string().optional(),
            location: z.string().optional(),
            status: z.string().optional()
        });

        const event = ProviderEventSchema.parse(response.data);

        return {
            id: event.id,
            iCalUID: event.iCalUID,
            ...(event.summary !== undefined && { summary: event.summary }),
            ...(event.start !== undefined && { start: event.start }),
            ...(event.end !== undefined && { end: event.end }),
            ...(event.description !== undefined && { description: event.description }),
            ...(event.location !== undefined && { location: event.location }),
            ...(event.status !== undefined && { status: event.status })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
