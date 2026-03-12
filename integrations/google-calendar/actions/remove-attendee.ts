import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    calendar_id: z.string().describe('Calendar identifier. Use "primary" for the primary calendar of the currently logged in user.'),
    event_id: z.string().describe('Event identifier.'),
    attendee_email: z.string().email().describe('Email address of the attendee to remove from the event.')
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
    summary: z.union([z.string(), z.null()]),
    attendees: z.array(AttendeeSchema),
    removed_attendee: z.union([AttendeeSchema, z.null()]),
    success: z.boolean()
});

const action = createAction({
    description: 'Fetch an event, remove an attendee by email, and patch attendees',
    version: '1.0.0',

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
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(input.calendar_id)}/events/${encodeURIComponent(input.event_id)}`,
            retries: 3
        });

        if (!getResponse.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Event not found',
                calendar_id: input.calendar_id,
                event_id: input.event_id
            });
        }

        const event = getResponse.data as { id: string; summary?: string; attendees?: Array<{ email: string } & Record<string, unknown>> };
        const currentAttendees = event.attendees || [];

        // Find the attendee to remove
        const attendeeIndex = currentAttendees.findIndex((attendee) => attendee.email === input.attendee_email);

        if (attendeeIndex === -1) {
            return {
                id: event.id,
                summary: event.summary ?? null,
                attendees: currentAttendees,
                removed_attendee: null,
                success: false
            };
        }

        const removedAttendee = currentAttendees[attendeeIndex] as {
            email: string;
            displayName?: string;
            organizer?: boolean;
            self?: boolean;
            resource?: boolean;
            optional?: boolean;
            responseStatus?: string;
            comment?: string;
            additionalGuests?: number;
        };

        // Remove the attendee from the array
        const updatedAttendees = currentAttendees.filter((_, index) => index !== attendeeIndex);

        // https://developers.google.com/workspace/calendar/api/v3/reference/events/patch
        const patchResponse = await nango.patch({
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(input.calendar_id)}/events/${encodeURIComponent(input.event_id)}`,
            data: {
                attendees: updatedAttendees
            },
            retries: 10
        });

        if (!patchResponse.data) {
            throw new nango.ActionError({
                type: 'patch_failed',
                message: 'Failed to patch event with updated attendees',
                calendar_id: input.calendar_id,
                event_id: input.event_id
            });
        }

        const patchedEvent = patchResponse.data as { id: string; summary?: string; attendees?: Array<{ email: string } & Record<string, unknown>> };

        return {
            id: patchedEvent.id,
            summary: patchedEvent.summary ?? null,
            attendees: patchedEvent.attendees || [],
            removed_attendee: removedAttendee,
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
