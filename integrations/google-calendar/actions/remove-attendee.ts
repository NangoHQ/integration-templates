import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        calendarId: z.string().optional().describe('Calendar identifier. Use "primary" for the default calendar.'),
        eventId: z.string().describe('The event identifier.'),
        attendeeEmail: z.string().describe('The email address of the attendee to remove.')
    })
    .describe('Input for removing an attendee from a Google Calendar event');

const ProviderAttendeeSchema = z.object({
    email: z.string(),
    displayName: z.string().optional(),
    responseStatus: z.string().optional()
});

const ProviderEventSchema = z.object({
    id: z.string(),
    summary: z.string().optional(),
    attendees: z.array(ProviderAttendeeSchema).optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('The event ID.'),
        summary: z.string().optional().describe('The event title.'),
        attendees: z
            .array(
                z.object({
                    email: z.string().describe('The attendee email address.'),
                    displayName: z.string().optional().describe('The attendee display name.'),
                    responseStatus: z.string().optional().describe('The attendee response status.')
                })
            )
            .optional()
            .describe('The updated list of attendees.')
    })
    .describe('Output after removing an attendee from a Google Calendar event');

/**
 * @tags: [read, write]
 * @tagReason: Reads the existing event before updating its attendees.
 */
const action = createAction({
    description: 'Remove an attendee from a Google Calendar event by email',
    version: '2.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const calendarId = input.calendarId ?? 'primary';

        // https://developers.google.com/workspace/calendar/api/v3/reference/events/get
        const getResponse = await nango.get({
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(input.eventId)}`,
            retries: 3
        });

        const event = ProviderEventSchema.parse(getResponse.data);

        const currentAttendees = event.attendees ?? [];
        const normalizedEmail = input.attendeeEmail.toLowerCase();
        const filteredAttendees = currentAttendees.filter((a) => a.email.toLowerCase() !== normalizedEmail);

        if (filteredAttendees.length === currentAttendees.length) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Attendee ${input.attendeeEmail} not found on event ${input.eventId}`
            });
        }

        // https://developers.google.com/workspace/calendar/api/v3/reference/events/patch
        const patchResponse = await nango.patch({
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(input.eventId)}`,
            data: {
                attendees: filteredAttendees
            },
            retries: 1
        });

        const updatedEvent = ProviderEventSchema.parse(patchResponse.data);

        return {
            id: updatedEvent.id,
            ...(updatedEvent.summary !== undefined && { summary: updatedEvent.summary }),
            ...(updatedEvent.attendees !== undefined && {
                attendees: updatedEvent.attendees.map((a) => ({
                    email: a.email,
                    ...(a.displayName !== undefined && { displayName: a.displayName }),
                    ...(a.responseStatus !== undefined && { responseStatus: a.responseStatus })
                }))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
