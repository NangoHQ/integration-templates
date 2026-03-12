import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    calendar_id: z.string().describe('Calendar ID. Use "primary" for the default calendar. Example: "primary"'),
    event_id: z.string().describe('Event ID to add attendee to. Example: "abc123xyz"'),
    attendee_email: z.string().email().describe('Email address of the attendee to add. Example: "attendee@example.com"'),
    attendee_name: z.string().optional().describe('Display name of the attendee (optional). Example: "John Doe"'),
    optional: z.boolean().optional().describe('Whether the attendee is optional (optional). Default: false'),
    response_status: z
        .enum(['needsAction', 'declined', 'tentative', 'accepted'])
        .optional()
        .describe('Response status of the attendee (optional). Default: "needsAction"')
});

const AttendeeSchema = z.object({
    email: z.string(),
    displayName: z.union([z.string(), z.null()]),
    optional: z.boolean().optional(),
    responseStatus: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    summary: z.union([z.string(), z.null()]),
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
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(input.calendar_id)}/events/${encodeURIComponent(input.event_id)}`,
            retries: 3
        });

        if (!getResponse.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Event not found',
                event_id: input.event_id,
                calendar_id: input.calendar_id
            });
        }

        const existingEvent = getResponse.data;
        const existingAttendees = existingEvent.attendees || [];

        // Step 2: Check if attendee already exists
        const attendeeExists = existingAttendees.some((attendee: { email: string }) => attendee.email.toLowerCase() === input.attendee_email.toLowerCase());

        if (attendeeExists) {
            throw new nango.ActionError({
                type: 'duplicate_attendee',
                message: 'Attendee already exists in this event',
                attendee_email: input.attendee_email
            });
        }

        // Step 3: Create new attendee object
        const newAttendee: {
            email: string;
            displayName?: string;
            optional?: boolean;
            responseStatus?: string;
        } = {
            email: input.attendee_email,
            ...(input.attendee_name && { displayName: input.attendee_name }),
            ...(input.optional !== undefined && { optional: input.optional }),
            ...(input.response_status && { responseStatus: input.response_status })
        };

        // Step 4: Append the new attendee to the list
        const updatedAttendees = [...existingAttendees, newAttendee];

        // Step 5: Patch the event with the updated attendee list
        // https://developers.google.com/calendar/api/v3/reference/events/patch
        const patchResponse = await nango.patch({
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(input.calendar_id)}/events/${encodeURIComponent(input.event_id)}`,
            data: {
                attendees: updatedAttendees
            },
            retries: 10 // Non-idempotent write - no retries
        });

        const updatedEvent = patchResponse.data;

        return {
            id: updatedEvent.id,
            summary: updatedEvent.summary ?? null,
            attendees: (updatedEvent.attendees || []).map((attendee: { email: string; displayName?: string; optional?: boolean; responseStatus?: string }) => ({
                email: attendee.email,
                displayName: attendee.displayName ?? null,
                optional: attendee.optional,
                responseStatus: attendee.responseStatus
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
