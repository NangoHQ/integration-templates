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
    calendar_id: z.string().describe('Calendar identifier. Use "primary" for the main calendar'),
    event_id: z.string().describe('Event identifier'),
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
    send_updates: z.enum(['all', 'externalOnly', 'none']).optional().describe('Who should receive notifications about the event update')
});

const OutputSchema = z.object({
    id: z.string(),
    summary: z.union([z.string(), z.null()]),
    description: z.union([z.string(), z.null()]),
    location: z.union([z.string(), z.null()]),
    start: z.union([DateTimeSchema, z.null()]),
    end: z.union([DateTimeSchema, z.null()]),
    status: z.union([z.string(), z.null()]),
    visibility: z.union([z.string(), z.null()]),
    htmlLink: z.union([z.string(), z.null()]),
    created: z.union([z.string(), z.null()]),
    updated: z.union([z.string(), z.null()]),
    organizer: z.union([
        z.object({
            id: z.string().optional(),
            email: z.string().optional(),
            displayName: z.string().optional(),
            self: z.boolean().optional()
        }),
        z.null()
    ]),
    attendees: z.union([z.array(AttendeeSchema), z.null()])
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
            endpoint: `/calendar/v3/calendars/${input.calendar_id}/events/${input.event_id}`,
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
                ...(input.send_updates && { sendUpdates: input.send_updates })
            },
            retries: 3
        });

        const event = response.data;

        return {
            id: event.id,
            summary: event.summary ?? null,
            description: event.description ?? null,
            location: event.location ?? null,
            start: event.start ?? null,
            end: event.end ?? null,
            status: event.status ?? null,
            visibility: event.visibility ?? null,
            htmlLink: event.htmlLink ?? null,
            created: event.created ?? null,
            updated: event.updated ?? null,
            organizer: event.organizer ?? null,
            attendees: event.attendees ?? null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
