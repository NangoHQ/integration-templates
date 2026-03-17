import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    calendarId: z.string().describe('Calendar identifier. To retrieve calendar IDs call the calendarList.list method. Use "primary" for the primary calendar.'),
    channelId: z.string().describe('A unique UUID or similar unique string that identifies this channel.'),
    webhookUrl: z.string().url().describe('The URL where notifications will be delivered.'),
    token: z.string().optional().describe('An opaque token for verification. Google will include this token in notification messages.'),
    ttl: z.number().int().optional().describe('Time-to-live in seconds for the notification channel. Default is 604800 seconds (7 days).')
});

const OutputSchema = z.object({
    kind: z.string().describe('Identifies this as a notification channel, which is "api#channel".'),
    id: z.string().describe('The channel ID.'),
    resourceId: z.string().describe('An opaque ID that identifies the resource being watched on this channel.'),
    resourceUri: z.string().describe('A version-specific canonical URL for the watched resource.'),
    token: z.string().optional().describe('The token sent in the request (if any).'),
    expiration: z.string().optional().describe('Expiration time as a Unix timestamp (long), or omitted if no expiration.')
});

const action = createAction({
    description: 'Subscribe to event changes on a calendar',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/watch-events',
        group: 'Events'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly', 'https://www.googleapis.com/auth/calendar'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/calendar/api/v3/reference/events/watch
        const response = await nango.post({
            endpoint: `calendar/v3/calendars/${encodeURIComponent(input.calendarId)}/events/watch`,
            data: {
                id: input.channelId,
                type: 'web_hook',
                address: input.webhookUrl,
                ...(input.token && { token: input.token }),
                ...(input.ttl && { params: { ttl: String(input.ttl) } })
            },
            retries: 3
        });

        return {
            kind: response.data.kind,
            id: response.data.id,
            resourceId: response.data.resourceId,
            resourceUri: response.data.resourceUri,
            token: response.data.token ?? undefined,
            expiration: response.data.expiration ? String(response.data.expiration) : undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
