import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    calendarId: z.string().describe('Calendar identifier. Use "primary" for the primary calendar of the currently logged in user.'),
    eventId: z.string().describe('Event identifier.'),
    attendeeEmail: z.string().email().describe('Email address of the attendee to remove from the event.')
});

const AttendeeSchema = z.object({
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

const OutputSchema = z.object({
    id: z.string(),
    summary: z.string().optional(),
    attendees: z.array(AttendeeSchema),
    removedAttendee: AttendeeSchema.optional(),
    success: z.boolean()
});

const EventResponseSchema = z.object({
    id: z.string(),
    summary: z.string().nullish(),
    attendees: z.array(AttendeeSchema).optional()
});

const action = createAction({
    description: 'Fetch an event, remove an attendee by email, and patch attendees',
    version: '2.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/remove-attendee',
        group: 'Events'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar.events'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/calendar/api/v3/reference/events/get
        const getResponse = await nango.get({
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(input.calendarId)}/events/${encodeURIComponent(input.eventId)}`,
            retries: 3
        });

        if (!getResponse.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Event not found',
                calendarId: input.calendarId,
                eventId: input.eventId
            });
        }

        const event = EventResponseSchema.parse(getResponse.data);
        const currentAttendees = event.attendees || [];

        // Find the attendee to remove
        const attendeeIndex = currentAttendees.findIndex((attendee) => attendee.email === input.attendeeEmail);

        if (attendeeIndex === -1) {
            return {
                id: event.id,
                summary: event.summary ?? undefined,
                attendees: currentAttendees,
                removedAttendee: undefined,
                success: false
            };
        }

        const removedAttendee = currentAttendees[attendeeIndex] || undefined;

        // Remove the attendee from the array
        const updatedAttendees = currentAttendees.filter((_, index) => index !== attendeeIndex);

        // https://developers.google.com/workspace/calendar/api/v3/reference/events/patch
        const patchResponse = await nango.patch({
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(input.calendarId)}/events/${encodeURIComponent(input.eventId)}`,
            data: {
                attendees: updatedAttendees
            },
            retries: 3
        });

        if (!patchResponse.data) {
            throw new nango.ActionError({
                type: 'patch_failed',
                message: 'Failed to patch event with updated attendees',
                calendarId: input.calendarId,
                eventId: input.eventId
            });
        }

        const patchedEvent = EventResponseSchema.parse(patchResponse.data);

        return {
            id: patchedEvent.id,
            summary: patchedEvent.summary ?? undefined,
            attendees: patchedEvent.attendees || [],
            removedAttendee: removedAttendee,
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
