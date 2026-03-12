import { z } from 'zod';
import { createAction } from 'nango';

// https://developers.google.com/workspace/calendar/api/v3/reference/events/import

// Input schemas with strict validation
const InputAttendeeSchema = z.object({
    additionalGuests: z.number().optional(),
    comment: z.string().optional(),
    displayName: z.string().optional(),
    email: z.string().email(),
    optional: z.boolean().optional(),
    resource: z.boolean().optional(),
    responseStatus: z.enum(['needsAction', 'declined', 'tentative', 'accepted']).optional()
});

const InputEventTimeSchema = z.object({
    date: z.string().optional().describe('The date, in the format "yyyy-mm-dd", if this is an all-day event.'),
    dateTime: z.string().optional().describe('The time, as a combined date-time value (formatted according to RFC3339).'),
    timeZone: z.string().optional().describe('The time zone in which the time is specified (IANA Time Zone Database name, e.g. "Europe/Zurich").')
});

const InputSchema = z.object({
    calendar_id: z.string().describe('Calendar identifier. Use "primary" for the primary calendar of the currently logged in user.'),
    i_cal_uid: z.string().describe('Event unique identifier as defined in RFC5545. Used to uniquely identify events across calendaring systems.'),
    summary: z.string().optional().describe('Title of the event.'),
    description: z.string().optional().describe('Description of the event. Can contain HTML.'),
    location: z.string().optional().describe('Geographic location of the event as free-form text.'),
    start: InputEventTimeSchema.describe('The (inclusive) start time of the event.'),
    end: InputEventTimeSchema.describe('The (exclusive) end time of the event.'),
    attendees: z.array(InputAttendeeSchema).optional().describe('The attendees of the event.'),
    organizer: z
        .object({
            displayName: z.string().optional(),
            email: z.string().email().optional()
        })
        .optional()
        .describe('The organizer of the event.'),
    conference_data_version: z.number().min(0).max(1).optional().describe('Version number of conference data supported by the API client.'),
    supports_attachments: z.boolean().optional().describe('Whether API client performing operation supports event attachments.')
});

// Output schemas - keep them strict to match API validation
const OutputEventTimeSchema = z.object({
    date: z.string().optional(),
    dateTime: z.string().optional(),
    timeZone: z.string().optional()
});

const OutputAttendeeSchema = z.object({
    additionalGuests: z.number().optional(),
    comment: z.string().optional(),
    displayName: z.string().optional(),
    email: z.string(),
    optional: z.boolean().optional(),
    resource: z.boolean().optional(),
    responseStatus: z.enum(['needsAction', 'declined', 'tentative', 'accepted']).optional()
});

const OutputSchema = z.object({
    id: z.string().describe('Identifier of the event.'),
    i_cal_uid: z.string().describe('Event unique identifier as defined in RFC5545.'),
    summary: z.union([z.string(), z.null()]).optional(),
    description: z.union([z.string(), z.null()]).optional(),
    location: z.union([z.string(), z.null()]).optional(),
    status: z.enum(['confirmed', 'tentative', 'cancelled']).optional(),
    html_link: z.union([z.string(), z.null()]).optional(),
    start: OutputEventTimeSchema.optional(),
    end: OutputEventTimeSchema.optional(),
    attendees: z.array(OutputAttendeeSchema).optional(),
    organizer: z
        .object({
            displayName: z.union([z.string(), z.null()]).optional(),
            email: z.union([z.string(), z.null()]).optional()
        })
        .optional()
});

const action = createAction({
    description: 'Import an event as a private copy using an iCalendar UID',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/import-event',
        group: 'Events'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/calendar.app.created',
        'https://www.googleapis.com/auth/calendar.events.owned'
    ],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/calendar/api/v3/reference/events/import
        const response = await nango.post({
            endpoint: `/calendar/v3/calendars/${input.calendar_id}/events/import`,
            params: {
                ...(input.conference_data_version !== undefined && { conferenceDataVersion: String(input.conference_data_version) }),
                ...(input.supports_attachments !== undefined && { supportsAttachments: String(input.supports_attachments) })
            },
            data: {
                iCalUID: input.i_cal_uid,
                summary: input.summary,
                description: input.description,
                location: input.location,
                start: input.start,
                end: input.end,
                attendees: input.attendees,
                organizer: input.organizer
            },
            retries: 3
        });

        const event = response.data;

        return {
            id: event.id,
            i_cal_uid: event.iCalUID,
            summary: event.summary ?? null,
            description: event.description ?? null,
            location: event.location ?? null,
            status: event.status,
            html_link: event.htmlLink ?? null,
            start: event.start,
            end: event.end,
            attendees: event.attendees,
            organizer: event.organizer
                ? {
                      displayName: event.organizer.displayName ?? null,
                      email: event.organizer.email ?? null
                  }
                : undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
