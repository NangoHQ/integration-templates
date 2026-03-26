import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    calendarId: z.string().optional().describe('Calendar ID. Defaults to "primary". Example: "primary"'),
    eventId: z.string().describe('Event ID. Example: "abc123"'),
    attendeeEmail: z.string().describe('Email of the attendee to update. Example: "user@example.com"'),
    responseStatus: z.enum(['needsAction', 'declined', 'tentative', 'accepted']).describe('Response status for the attendee')
});

const OutputSchema = z.object({
    id: z.string(),
    htmlLink: z.string(),
    summary: z.string().optional(),
    attendees: z.array(
        z.object({
            email: z.string(),
            responseStatus: z.string()
        })
    )
});

const action = createAction({
    description: 'Fetch an event and update one attendee response status',
    version: '2.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/update-attendee-response',
        group: 'Events'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar.events'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const calendarId = input.calendarId || 'primary';

        // https://developers.google.com/calendar/api/v3/reference/events/get
        const getResponse = await nango.get({
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(input.eventId)}`,
            retries: 3
        });

        const event = getResponse.data;

        if (!event) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Event not found',
                eventId: input.eventId
            });
        }

        const attendees = event.attendees || [];
        const attendeeIndex = attendees.findIndex((a: { email: string }) => a.email.toLowerCase() === input.attendeeEmail.toLowerCase());

        if (attendeeIndex === -1) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Attendee not found in event',
                attendeeEmail: input.attendeeEmail,
                eventId: input.eventId
            });
        }

        attendees[attendeeIndex].responseStatus = input.responseStatus;

        // https://developers.google.com/calendar/api/v3/reference/events/update
        const updateResponse = await nango.put({
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(input.eventId)}`,
            data: {
                ...event,
                attendees: attendees
            },
            retries: 3
        });

        const updatedEvent = updateResponse.data;

        return {
            id: updatedEvent.id,
            htmlLink: updatedEvent.htmlLink,
            summary: updatedEvent.summary ?? undefined,
            attendees: (updatedEvent.attendees || []).map((a: { email: string; responseStatus?: string }) => ({
                email: a.email,
                responseStatus: a.responseStatus || 'needsAction'
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
