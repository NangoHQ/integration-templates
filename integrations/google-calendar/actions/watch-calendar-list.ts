import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('A UUID or similar unique string that identifies this channel. Example: "01234567-89ab-cdef-0123456789ab"'),
    address: z.string().describe('The address where notifications are delivered for this channel. Example: "https://example.com/webhook"'),
    token: z.string().optional().describe('An arbitrary string delivered to the target address with each notification delivered over this channel. Optional.'),
    ttl: z.number().optional().describe('The time-to-live in seconds for the notification channel. Default is 604800 seconds (7 days).')
});

const OutputSchema = z.object({
    kind: z.string().describe('Identifies this as a notification channel. Value is "api#channel".'),
    id: z.string().describe('A UUID or similar unique string that identifies this channel.'),
    resourceId: z.string().describe('An opaque ID that identifies the resource being watched on this channel. Stable across different API versions.'),
    resourceUri: z.string().describe('A version-specific identifier for the watched resource.'),
    token: z
        .union([z.string(), z.null()])
        .describe('An arbitrary string delivered to the target address with each notification delivered over this channel. Optional.'),
    expiration: z
        .union([z.number(), z.null()])
        .describe('Date and time of notification channel expiration, expressed as a Unix timestamp, in milliseconds. Optional.')
});

const action = createAction({
    description: 'Subscribe to changes in the calendar list',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/watch-calendar-list',
        group: 'CalendarList'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, unknown> = {
            id: input.id,
            type: 'web_hook',
            address: input.address
        };

        if (input.token) {
            requestBody['token'] = input.token;
        }

        if (input.ttl) {
            requestBody['params'] = {
                ttl: input.ttl.toString()
            };
        }

        const response = await nango.post({
            // https://developers.google.com/workspace/calendar/api/v3/reference/calendarList/watch
            endpoint: '/calendar/v3/users/me/calendarList/watch',
            data: requestBody,
            retries: 1
        });

        return {
            kind: response.data.kind,
            id: response.data.id,
            resourceId: response.data.resourceId,
            resourceUri: response.data.resourceUri,
            token: response.data.token ?? null,
            expiration: response.data.expiration ? Number(response.data.expiration) : null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
