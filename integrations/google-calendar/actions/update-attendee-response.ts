/**
 * Instructions: Updates an attendee's response status for an event
 *
 * API Docs: https://developers.google.com/calendar/api/v3/reference/events/patch
 */
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const UpdateAttendeeResponseInput = z.object({
    calendar_id: z.string(),
    event_id: z.string(),
    email: z.string(),
    responseStatus: z.string()
});

const UpdateAttendeeResponseOutput = z.object({
    kind: z.string(),
    etag: z.string(),
    id: z.string(),
    attendees: z.array(z.any())
});

const action = createAction({
    description: "Updates an attendee's response status for an event",
    version: '1.0.0',
    // https://developers.google.com/calendar/api/v3/reference/events/patch
    endpoint: {
        method: 'PATCH',
        path: '/events/attendee',
        group: 'Attendees'
    },
    input: UpdateAttendeeResponseInput,
    output: UpdateAttendeeResponseOutput,
    scopes: ['https://www.googleapis.com/auth/calendar'],
    exec: async (nango, input): Promise<z.infer<typeof UpdateAttendeeResponseOutput>> => {
        // First get the existing event to get current attendees
        const getConfig: ProxyConfiguration = {
            // https://developers.google.com/calendar/api/v3/reference/events/get
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(input.calendar_id)}/events/${encodeURIComponent(input.event_id)}`,
            retries: 3
        };

        const existingEvent = await nango.get(getConfig);
        const currentAttendees = existingEvent.data.attendees || [];

        // Update attendee response status
        const updatedAttendees = currentAttendees.map((attendee: { email: string; responseStatus?: string }) => {
            if (attendee.email === input.email) {
                return { ...attendee, responseStatus: input.responseStatus };
            }
            return attendee;
        });

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
