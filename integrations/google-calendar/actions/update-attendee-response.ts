import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    calendar_id: z.string().optional().describe('Calendar ID. Defaults to "primary". Example: "primary"'),
    event_id: z.string().describe('Event ID. Example: "abc123"'),
    attendee_email: z.string().describe('Email of the attendee to update. Example: "user@example.com"'),
    response_status: z.enum(['needsAction', 'declined', 'tentative', 'accepted']).describe('Response status for the attendee')
});

const OutputSchema = z.object({
    id: z.string(),
    htmlLink: z.string(),
    summary: z.union([z.string(), z.null()]),
    attendees: z.array(
        z.object({
            email: z.string(),
            responseStatus: z.string()
        })
    )
});

const action = createAction({
    description: 'Fetch an event and update one attendee response status',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/update-attendee-response',
        group: 'Events'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar.events'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const calendarId = input.calendar_id || 'primary';

        // https://developers.google.com/calendar/api/v3/reference/events/get
        const getResponse = await nango.get({
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(input.event_id)}`,
            retries: 3
        });

        const event = getResponse.data;

        if (!event) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Event not found',
                event_id: input.event_id
            });
        }

        const attendees = event.attendees || [];
        const attendeeIndex = attendees.findIndex((a: { email: string }) => a.email.toLowerCase() === input.attendee_email.toLowerCase());

        if (attendeeIndex === -1) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Attendee not found in event',
                attendee_email: input.attendee_email,
                event_id: input.event_id
            });
        }

        attendees[attendeeIndex].responseStatus = input.response_status;

        // https://developers.google.com/calendar/api/v3/reference/events/update
        const updateResponse = await nango.put({
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(input.event_id)}`,
            data: {
                ...event,
                attendees: attendees
            },
            retries: 1
        });

        const updatedEvent = updateResponse.data;

        return {
            id: updatedEvent.id,
            htmlLink: updatedEvent.htmlLink,
            summary: updatedEvent.summary ?? null,
            attendees: (updatedEvent.attendees || []).map((a: { email: string; responseStatus?: string }) => ({
                email: a.email,
                responseStatus: a.responseStatus || 'needsAction'
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
