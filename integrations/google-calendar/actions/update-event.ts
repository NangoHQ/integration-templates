import { z } from 'zod';
import { createAction } from 'nango';

const DateTimeSchema = z.object({
    date: z.string().optional().describe('Date in yyyy-mm-dd format for all-day events'),
    dateTime: z.string().optional().describe('DateTime in RFC3339 format for timed events'),
    timeZone: z.string().optional().describe('Time zone (IANA format, e.g., "Europe/Zurich")')
});

const AttendeeSchema = z.object({
    id: z.string().optional(),
    email: z.string().optional(),
    displayName: z.string().optional(),
    organizer: z.boolean().optional(),
    self: z.boolean().optional(),
    resource: z.boolean().optional(),
    optional: z.boolean().optional(),
    responseStatus: z.enum(['needsAction', 'declined', 'tentative', 'accepted']).optional(),
    comment: z.string().optional(),
    additionalGuests: z.number().optional()
});

const InputSchema = z.object({
    calendarId: z.string().describe('Calendar identifier. Use "primary" for the main calendar'),
    eventId: z.string().describe('Event identifier'),
    summary: z.string().optional().describe('Title of the event'),
    description: z.string().optional().describe('Description of the event'),
    location: z.string().optional().describe('Geographic location of the event'),
    start: DateTimeSchema.optional().describe('Start time of the event'),
    end: DateTimeSchema.optional().describe('End time of the event'),
    attendees: z.array(AttendeeSchema).optional().describe('Attendees of the event'),
    status: z.enum(['confirmed', 'tentative', 'cancelled']).optional().describe('Status of the event'),
    visibility: z.enum(['default', 'public', 'private', 'confidential']).optional().describe('Visibility of the event'),
    colorId: z.string().optional().describe('Color ID of the event'),
    reminders: z
        .object({
            useDefault: z.boolean().optional(),
            overrides: z
                .array(
                    z.object({
                        method: z.enum(['email', 'popup']),
                        minutes: z.number()
                    })
                )
                .optional()
        })
        .optional()
        .describe('Reminders for the event'),
    sendUpdates: z.enum(['all', 'externalOnly', 'none']).optional().describe('Who should receive notifications about the event update')
});

const OutputSchema = z.object({
    id: z.string(),
    summary: z.string().optional(),
    description: z.string().optional(),
    location: z.string().optional(),
    start: DateTimeSchema.optional(),
    end: DateTimeSchema.optional(),
    status: z.string().optional(),
    visibility: z.string().optional(),
    htmlLink: z.string().optional(),
    created: z.string().optional(),
    updated: z.string().optional(),
    organizer: z
        .object({
            id: z.string().optional(),
            email: z.string().optional(),
            displayName: z.string().optional(),
            self: z.boolean().optional()
        })
        .optional(),
    attendees: z.array(AttendeeSchema).optional()
});

const action = createAction({
    description: 'Update a calendar event',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/update-event',
        group: 'Events'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/calendar/api/v3/reference/events/patch
        const response = await nango.patch({
            endpoint: `/calendar/v3/calendars/${input.calendarId}/events/${input.eventId}`,
            data: {
                ...(input.summary && { summary: input.summary }),
                ...(input.description && { description: input.description }),
                ...(input.location && { location: input.location }),
                ...(input.start && { start: input.start }),
                ...(input.end && { end: input.end }),
                ...(input.attendees && { attendees: input.attendees }),
                ...(input.status && { status: input.status }),
                ...(input.visibility && { visibility: input.visibility }),
                ...(input.colorId && { colorId: input.colorId }),
                ...(input.reminders && { reminders: input.reminders })
            },
            params: {
                ...(input.sendUpdates && { sendUpdates: input.sendUpdates })
            },
            retries: 3
        });

        const event = response.data;

        return {
            id: event.id,
            summary: event.summary ?? undefined,
            description: event.description ?? undefined,
            location: event.location ?? undefined,
            start: event.start ?? undefined,
            end: event.end ?? undefined,
            status: event.status ?? undefined,
            visibility: event.visibility ?? undefined,
            htmlLink: event.htmlLink ?? undefined,
            created: event.created ?? undefined,
            updated: event.updated ?? undefined,
            organizer: event.organizer ?? undefined,
            attendees: event.attendees ?? undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
