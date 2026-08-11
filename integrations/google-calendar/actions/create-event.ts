import { z } from 'zod';
import { createAction } from 'nango';

const EventTimeInputSchema = z.object({
    dateTime: z.string().optional().describe('Combined date and time value in RFC3339 format. Example: "2026-08-12T10:00:00Z"'),
    date: z.string().optional().describe('Date in YYYY-MM-DD format for all-day events. Example: "2026-08-12"'),
    timeZone: z.string().optional().describe('Time zone for the event time. Example: "America/New_York"')
});

const AttendeeInputSchema = z.object({
    email: z.string().describe('Attendee email address. Example: "user@example.com"')
});

const InputSchema = z
    .object({
        calendarId: z.string().describe('Calendar ID where the event will be created. Example: "primary" or "abc@group.calendar.google.com"'),
        summary: z.string().optional().describe('Title of the event. Example: "Team Meeting"'),
        description: z.string().optional().describe('Description of the event. Example: "Discuss quarterly goals"'),
        location: z.string().optional().describe('Location of the event. Example: "Conference Room A"'),
        start: EventTimeInputSchema.describe('Start time of the event'),
        end: EventTimeInputSchema.describe('End time of the event'),
        attendees: z.array(AttendeeInputSchema).optional().describe('List of attendees for the event'),
        recurrence: z.array(z.string()).optional().describe('RRULE strings defining event recurrence. Example: ["RRULE:FREQ=DAILY;COUNT=2"]')
    })
    .describe('Input for creating a Google Calendar event');

const EventTimeOutputSchema = z.object({
    dateTime: z.string().optional().describe('Combined date and time value in RFC3339 format'),
    date: z.string().optional().describe('Date in YYYY-MM-DD format for all-day events'),
    timeZone: z.string().optional().describe('Time zone for the event time')
});

const OrganizerOutputSchema = z.object({
    email: z.string().optional().describe('Organizer email address'),
    displayName: z.string().optional().describe('Organizer display name')
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the created event. Example: "abc123"'),
        summary: z.string().optional().describe('Title of the event'),
        description: z.string().optional().describe('Description of the event'),
        location: z.string().optional().describe('Location of the event'),
        status: z.string().describe('Status of the event. Example: "confirmed"'),
        htmlLink: z.string().describe('URL to view the event in Google Calendar'),
        created: z.string().describe('Creation timestamp in RFC3339 format'),
        updated: z.string().describe('Last update timestamp in RFC3339 format'),
        start: EventTimeOutputSchema.optional().describe('Start time of the event'),
        end: EventTimeOutputSchema.optional().describe('End time of the event'),
        iCalUID: z.string().describe('iCalendar UID of the event'),
        organizer: OrganizerOutputSchema.optional().describe('Organizer of the event')
    })
    .describe('Output of a created Google Calendar event');

const ProviderEventTimeSchema = z.object({
    dateTime: z.string().optional(),
    date: z.string().optional(),
    timeZone: z.string().optional()
});

const ProviderOrganizerSchema = z.object({
    email: z.string().optional(),
    displayName: z.string().optional()
});

const ProviderEventSchema = z.object({
    id: z.string(),
    summary: z.string().optional(),
    description: z.string().optional(),
    location: z.string().optional(),
    status: z.string(),
    htmlLink: z.string(),
    created: z.string(),
    updated: z.string(),
    start: ProviderEventTimeSchema.optional(),
    end: ProviderEventTimeSchema.optional(),
    iCalUID: z.string(),
    organizer: ProviderOrganizerSchema.optional()
});

/**
 * @tags: [write]
 * @tagReason: Creates a new calendar event on the provider.
 * @pitfalls: Adding attendees causes Google to send invitation emails automatically; all-day events require date instead of dateTime for both start and end.
 */
const action = createAction({
    description: 'Create a calendar event',
    version: '2.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {
            start: input.start,
            end: input.end,
            ...(input.summary !== undefined && { summary: input.summary }),
            ...(input.description !== undefined && { description: input.description }),
            ...(input.location !== undefined && { location: input.location }),
            ...(input.attendees !== undefined && { attendees: input.attendees }),
            ...(input.recurrence !== undefined && { recurrence: input.recurrence })
        };

        // https://developers.google.com/calendar/api/v3/reference/events/insert
        const response = await nango.post({
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(input.calendarId)}/events`,
            data: body,
            retries: 10
        });

        const providerEvent = ProviderEventSchema.parse(response.data);

        return {
            id: providerEvent.id,
            status: providerEvent.status,
            htmlLink: providerEvent.htmlLink,
            created: providerEvent.created,
            updated: providerEvent.updated,
            iCalUID: providerEvent.iCalUID,
            ...(providerEvent.summary !== undefined && { summary: providerEvent.summary }),
            ...(providerEvent.description !== undefined && { description: providerEvent.description }),
            ...(providerEvent.location !== undefined && { location: providerEvent.location }),
            ...(providerEvent.start !== undefined && {
                start: {
                    ...(providerEvent.start.dateTime !== undefined && { dateTime: providerEvent.start.dateTime }),
                    ...(providerEvent.start.date !== undefined && { date: providerEvent.start.date }),
                    ...(providerEvent.start.timeZone !== undefined && { timeZone: providerEvent.start.timeZone })
                }
            }),
            ...(providerEvent.end !== undefined && {
                end: {
                    ...(providerEvent.end.dateTime !== undefined && { dateTime: providerEvent.end.dateTime }),
                    ...(providerEvent.end.date !== undefined && { date: providerEvent.end.date }),
                    ...(providerEvent.end.timeZone !== undefined && { timeZone: providerEvent.end.timeZone })
                }
            }),
            ...(providerEvent.organizer !== undefined && {
                organizer: {
                    ...(providerEvent.organizer.email !== undefined && { email: providerEvent.organizer.email }),
                    ...(providerEvent.organizer.displayName !== undefined && { displayName: providerEvent.organizer.displayName })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
