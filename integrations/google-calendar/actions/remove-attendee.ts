/**
 * Instructions: Removes an attendee from an existing calendar event
 *
 * API Docs: https://developers.google.com/calendar/api/v3/reference/events/patch
 */
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const RemoveAttendeeInput = z.object({
    calendar_id: z.string(),
    event_id: z.string(),
    email: z.string()
});

const RemoveAttendeeOutput = z.object({
    kind: z.string(),
    etag: z.string(),
    id: z.string(),
    attendees: z.array(z.any())
});

const action = createAction({
    description: 'Removes an attendee from an existing calendar event',
    version: '1.0.0',
    // https://developers.google.com/calendar/api/v3/reference/events/patch
    endpoint: {
        method: 'DELETE',
        path: '/events/attendee',
        group: 'Attendees'
    },
    input: RemoveAttendeeInput,
    output: RemoveAttendeeOutput,
    scopes: ['https://www.googleapis.com/auth/calendar'],
    exec: async (nango, input): Promise<z.infer<typeof RemoveAttendeeOutput>> => {
        // First get the existing event to get current attendees
        const getConfig: ProxyConfiguration = {
            // https://developers.google.com/calendar/api/v3/reference/events/get
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(input.calendar_id)}/events/${encodeURIComponent(input.event_id)}`,
            retries: 3
        };

        const existingEvent = await nango.get(getConfig);
        const currentAttendees = existingEvent.data.attendees || [];

        // Remove attendee by email
        const updatedAttendees = currentAttendees.filter((attendee: { email: string }) => attendee.email !== input.email);

        const config: ProxyConfiguration = {
            // https://developers.google.com/calendar/api/v3/reference/events/patch
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(input.calendar_id)}/events/${encodeURIComponent(input.event_id)}`,
            data: {
                attendees: updatedAttendees
            },
            retries: 3
        };

        const response = await nango.patch(config);

        return {
            kind: response.data.kind,
            etag: response.data.etag,
            id: response.data.id,
            attendees: response.data.attendees || []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
