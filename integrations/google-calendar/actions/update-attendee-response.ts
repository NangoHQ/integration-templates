import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        calendarId: z.string().optional().describe('Calendar identifier. Use "primary" for the primary calendar. Example: "primary"'),
        eventId: z.string().describe('Event identifier. Example: "abc123def456"'),
        attendeeEmail: z.string().describe('Email address of the attendee whose response status should be updated. Example: "user@example.com"'),
        responseStatus: z
            .enum(['needsAction', 'declined', 'tentative', 'accepted'])
            .describe("The attendee's new response status. Possible values: needsAction, declined, tentative, accepted.")
    })
    .describe('Input for updating an attendee response status on a Google Calendar event.');

const AttendeeSchema = z
    .object({
        email: z.string().describe("The attendee's email address."),
        responseStatus: z.string().describe("The attendee's response status."),
        displayName: z.string().optional().describe("The attendee's display name, if available."),
        optional: z.boolean().optional().describe('Whether this is an optional attendee.'),
        organizer: z.boolean().optional().describe('Whether the attendee is the organizer of the event.'),
        self: z.boolean().optional().describe('Whether the attendee is the calendar owner.')
    })
    .describe('An attendee of a Google Calendar event.');

const OutputSchema = z
    .object({
        eventId: z.string().describe('The updated event identifier.'),
        calendarId: z.string().describe('The calendar identifier.'),
        attendee: AttendeeSchema.describe('The updated attendee details.')
    })
    .describe('Output of updating an attendee response status on a Google Calendar event.');

/**
 * @tags: [read, write]
 * @tagReason: Reads the existing event to retrieve current attendees, then patches the event to update one attendee's response status.
 * @pitfalls: Only the event organizer can change attendee response statuses; non-organizers receive 403 forbiddenForNonOrganizer. Google may reset an attendee to needsAction when their calendar "Add invitations" setting is "When I respond in email" or "Only if the sender is known", so the returned status can differ from the request.
 */
const action = createAction({
    description: "Fetch an event and update one attendee's response status",
    version: '2.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar.events'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const calendarId = input.calendarId || 'primary';
        const eventId = input.eventId;
        const attendeeEmail = input.attendeeEmail;
        const responseStatus = input.responseStatus;

        // https://developers.google.com/workspace/calendar/api/v3/reference/events/get
        const getResponse = await nango.get({
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
            retries: 3
        });

        const rawEvent = getResponse.data;

        if (!rawEvent || typeof rawEvent !== 'object') {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Event not found or invalid response from provider.'
            });
        }

        const attendees = Array.isArray(rawEvent.attendees) ? rawEvent.attendees : [];
        const attendeeIndex = attendees.findIndex((a: unknown) => {
            if (a && typeof a === 'object' && 'email' in a && typeof a.email === 'string') {
                return a.email.toLowerCase() === attendeeEmail.toLowerCase();
            }
            return false;
        });

        if (attendeeIndex === -1) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Attendee with email ${attendeeEmail} not found on event.`,
                attendeeEmail: attendeeEmail,
                eventId: eventId
            });
        }

        const updatedAttendees = attendees.map((a: unknown, index: number) => {
            if (index === attendeeIndex) {
                if (a && typeof a === 'object') {
                    return { ...a, responseStatus: responseStatus };
                }
                return a;
            }
            return a;
        });

        // https://developers.google.com/workspace/calendar/api/v3/reference/events/patch
        const patchResponse = await nango.patch({
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
            data: {
                attendees: updatedAttendees
            },
            retries: 1
        });

        const patchedEvent = patchResponse.data;

        if (!patchedEvent || typeof patchedEvent !== 'object') {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Invalid response after patching event.'
            });
        }

        const patchedAttendees = Array.isArray(patchedEvent.attendees) ? patchedEvent.attendees : [];
        const matchedAttendee = patchedAttendees.find((a: unknown) => {
            if (a && typeof a === 'object' && 'email' in a && typeof a.email === 'string') {
                return a.email.toLowerCase() === attendeeEmail.toLowerCase();
            }
            return false;
        });

        if (!matchedAttendee || typeof matchedAttendee !== 'object') {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Attendee missing from patched event response.'
            });
        }

        return {
            eventId: String(patchedEvent.id || eventId),
            calendarId: calendarId,
            attendee: {
                email: String(matchedAttendee.email),
                responseStatus: String(matchedAttendee.responseStatus || responseStatus),
                ...(matchedAttendee.displayName != null && { displayName: String(matchedAttendee.displayName) }),
                ...(matchedAttendee.optional != null && { optional: Boolean(matchedAttendee.optional) }),
                ...(matchedAttendee.organizer != null && { organizer: Boolean(matchedAttendee.organizer) }),
                ...(matchedAttendee.self != null && { self: Boolean(matchedAttendee.self) })
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
