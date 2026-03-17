import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    calendarId: z.string().describe('Calendar ID. Use "primary" for the default calendar. Example: "primary"'),
    eventId: z.string().describe('Event ID to add attendee to. Example: "abc123xyz"'),
    attendeeEmail: z.string().email().describe('Email address of the attendee to add. Example: "attendee@example.com"'),
    attendeeName: z.string().optional().describe('Display name of the attendee (optional). Example: "John Doe"'),
    optional: z.boolean().optional().describe('Whether the attendee is optional (optional). Default: false'),
    responseStatus: z
        .enum(['needsAction', 'declined', 'tentative', 'accepted'])
        .optional()
        .describe('Response status of the attendee (optional). Default: "needsAction"')
});

const AttendeeSchema = z.object({
    email: z.string(),
    displayName: z.string().optional(),
    optional: z.boolean().optional(),
    responseStatus: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    summary: z.string().optional(),
    attendees: z.array(AttendeeSchema)
});

const action = createAction({
    description: 'Add an attendee to an existing calendar event',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/add-attendee',
        group: 'Events'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Step 1: Fetch the existing event
        // https://developers.google.com/calendar/api/v3/reference/events/get
        const getResponse = await nango.get({
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(input.calendarId)}/events/${encodeURIComponent(input.eventId)}`,
            retries: 3
        });

        if (!getResponse.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Event not found',
                eventId: input.eventId,
                calendarId: input.calendarId
            });
        }

        const existingEvent = getResponse.data;
        const existingAttendees = existingEvent.attendees || [];

        // Step 2: Check if attendee already exists
        const attendeeExists = existingAttendees.some((attendee: { email: string }) => attendee.email.toLowerCase() === input.attendeeEmail.toLowerCase());

        if (attendeeExists) {
            throw new nango.ActionError({
                type: 'duplicate_attendee',
                message: 'Attendee already exists in this event',
                attendeeEmail: input.attendeeEmail
            });
        }

        // Step 3: Create new attendee object
        const newAttendee: {
            email: string;
            displayName?: string;
            optional?: boolean;
            responseStatus?: string;
        } = {
            email: input.attendeeEmail,
            ...(input.attendeeName && { displayName: input.attendeeName }),
            ...(input.optional !== undefined && { optional: input.optional }),
            ...(input.responseStatus && { responseStatus: input.responseStatus })
        };

        // Step 4: Append the new attendee to the list
        const updatedAttendees = [...existingAttendees, newAttendee];

        // Step 5: Patch the event with the updated attendee list
        // https://developers.google.com/calendar/api/v3/reference/events/patch
        const patchResponse = await nango.patch({
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(input.calendarId)}/events/${encodeURIComponent(input.eventId)}`,
            data: {
                attendees: updatedAttendees
            },
            retries: 3
        });

        const updatedEvent = patchResponse.data;

        return {
            id: updatedEvent.id,
            summary: updatedEvent.summary ?? undefined,
            attendees: (updatedEvent.attendees || []).map((attendee: { email: string; displayName?: string; optional?: boolean; responseStatus?: string }) => ({
                email: attendee.email,
                displayName: attendee.displayName ?? undefined,
                optional: attendee.optional,
                responseStatus: attendee.responseStatus
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
