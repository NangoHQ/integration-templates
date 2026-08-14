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
    id: z.string().optional(),
    email: z.string(),
    displayName: z.string().optional(),
    organizer: z.boolean().optional(),
    self: z.boolean().optional(),
    resource: z.boolean().optional(),
    optional: z.boolean().optional(),
    responseStatus: z.string().optional(),
    comment: z.string().optional(),
    additionalGuests: z.number().optional()
});

const ProviderEventSchema = z.object({
    id: z.string(),
    summary: z.string().optional(),
    attendees: z.array(ProviderAttendeeSchema).optional()
});

const AttendeeSchema = z.object({
    id: z.string().optional().describe('The attendee profile ID, if known.'),
    email: z.string().describe('The attendee email address.'),
    displayName: z.string().optional().describe('The attendee display name.'),
    organizer: z.boolean().optional().describe('Whether the attendee is the organizer.'),
    self: z.boolean().optional().describe('Whether this entry represents the calendar on which this copy of the event appears.'),
    resource: z.boolean().optional().describe('Whether the attendee is a resource.'),
    optional: z.boolean().optional().describe('Whether this is an optional attendee.'),
    responseStatus: z.string().optional().describe('The attendee response status.'),
    comment: z.string().optional().describe("The attendee's response comment."),
    additionalGuests: z.number().optional().describe('Number of additional guests the attendee is bringing.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('The event ID.'),
        summary: z.string().optional().describe('The event title.'),
        attendees: z.array(AttendeeSchema).describe('The updated list of attendees.'),
        removedAttendee: AttendeeSchema.optional().describe('The attendee that was removed.'),
        success: z.boolean().describe('Whether the attendee was found and removed.')
    })
    .describe('Output after removing an attendee from a Google Calendar event');

/**
 * @tags: [read, write]
 * @tagReason: Reads the existing event before updating its attendees.
 * @pitfalls: Because attendees must be replaced wholesale, every remaining attendee's full provider fields are preserved and resent to avoid silently dropping their metadata (organizer, self, resource, comment, etc.).
 */
const action = createAction({
    description: 'Remove an attendee from a Google Calendar event by email',
    version: '2.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar.events'],

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
        const removedAttendee = currentAttendees.find((a) => a.email.toLowerCase() === normalizedEmail);
        const filteredAttendees = currentAttendees.filter((a) => a.email.toLowerCase() !== normalizedEmail);

        if (!removedAttendee) {
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
            retries: 3
        });

        const updatedEvent = ProviderEventSchema.parse(patchResponse.data);

        return {
            id: updatedEvent.id,
            ...(updatedEvent.summary !== undefined && { summary: updatedEvent.summary }),
            attendees: updatedEvent.attendees ?? [],
            removedAttendee,
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
