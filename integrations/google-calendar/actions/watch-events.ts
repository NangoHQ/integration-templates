import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        calendarId: z.string().describe('Calendar identifier. Use "primary" for the primary calendar of the authenticated user.'),
        channelId: z.string().describe('A UUID or similar unique string that identifies this notification channel.'),
        address: z.string().describe('The URL where notifications are delivered for this channel.'),
        type: z.string().optional().describe('The type of delivery mechanism. Valid values are "web_hook" or "webhook". Defaults to "web_hook".'),
        token: z.string().optional().describe('An arbitrary string delivered to the target address with each notification.'),
        ttl: z.number().int().optional().describe('Time-to-live in seconds for the notification channel. Default is 604800 seconds (7 days).')
    })
    .describe('Input to subscribe to event changes on a Google Calendar.');

const OutputSchema = z
    .object({
        kind: z.string().describe('Identifies this as a notification channel. Value is "api#channel".'),
        id: z.string().describe('A UUID or similar unique string that identifies this channel.'),
        resourceId: z.string().describe('An opaque ID that identifies the resource being watched on this channel.'),
        resourceUri: z.string().describe('A version-specific identifier for the watched resource.'),
        token: z.string().optional().describe('An arbitrary string delivered to the target address with each notification.'),
        expiration: z.string().optional().describe('Expiration time as a Unix timestamp (long), or omitted if no expiration.')
    })
    .describe('Output of a successful calendar event watch subscription, containing channel and resource identifiers.');

/**
 * @tags: [write]
 * @tagReason: Creates a new push notification channel at Google to watch for event changes.
 * @pitfalls: Channels expire automatically after the TTL and must be recreated; reusing a channel ID without stopping the previous channel first will fail.
 */
const action = createAction({
    description: 'Subscribe to event changes on a calendar',
    version: '1.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: {
            id: string;
            type: string;
            address: string;
            token?: string;
            params?: {
                ttl?: string;
            };
        } = {
            id: input.channelId,
            type: input.type || 'web_hook',
            address: input.address
        };

        if (input.token !== undefined) {
            body.token = input.token;
        }

        if (input.ttl !== undefined) {
            body.params = { ttl: String(input.ttl) };
        }

        const response = await nango.post({
            // https://developers.google.com/workspace/calendar/api/v3/reference/events/watch
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(input.calendarId)}/events/watch`,
            data: body,
            retries: 3
        });

        const providerResponse = z
            .object({
                kind: z.string(),
                id: z.string(),
                resourceId: z.string(),
                resourceUri: z.string(),
                token: z.string().optional(),
                expiration: z.union([z.number(), z.string()]).optional()
            })
            .parse(response.data);

        const parsedExpiration = providerResponse.expiration !== undefined ? String(providerResponse.expiration) : undefined;

        return {
            kind: providerResponse.kind,
            id: providerResponse.id,
            resourceId: providerResponse.resourceId,
            resourceUri: providerResponse.resourceUri,
            ...(providerResponse.token !== undefined && { token: providerResponse.token }),
            ...(parsedExpiration !== undefined && { expiration: parsedExpiration })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
