import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    channelId: z.string().describe('A UUID or similar unique string that identifies this channel. Example: "01234567-89ab-cdef-0123-456789abcdef"'),
    callbackUrl: z
        .string()
        .describe('The address where notifications are delivered for this channel. Must be a valid HTTPS URL that is reachable by Google servers.'),
    channelType: z
        .enum(['web_hook', 'webhook'])
        .describe('The type of delivery mechanism used for this channel. Valid values are "web_hook" or "webhook". Both refer to HTTP request delivery.'),
    channelToken: z
        .string()
        .optional()
        .describe('An arbitrary string delivered to the target address with each notification. Optional but useful for verifying webhook authenticity.'),
    ttl: z.string().optional().describe('The time-to-live in seconds for the notification channel. Default is 604800 seconds (7 days).')
});

const OutputSchema = z.object({
    kind: z.string().describe('Identifies this as a notification channel, value is "api#channel".'),
    channelId: z.string().describe('The unique string that identifies this channel.'),
    resourceId: z.string().describe('An opaque ID that identifies the resource being watched on this channel.'),
    resourceUri: z.string().describe('A version-specific identifier for the watched resource.'),
    channelToken: z.string().optional().describe('The arbitrary string delivered with each notification.'),
    expiration: z
        .union([z.string(), z.number(), z.null()])
        .describe('Date and time of notification channel expiration, expressed as a Unix timestamp in milliseconds.')
});

const action = createAction({
    description: 'Subscribe to changes in calendar settings',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/watch-settings',
        group: 'Settings'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: [
        'https://www.googleapis.com/auth/calendar.settings.readonly',
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar'
    ],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/calendar/api/v3/reference/settings/watch
        const config = {
            endpoint: '/calendar/v3/users/me/settings/watch',
            data: {
                id: input.channelId,
                type: input.channelType,
                address: input.callbackUrl,
                ...(input.channelToken && { token: input.channelToken }),
                ...(input.ttl && { params: { ttl: input.ttl } })
            },
            retries: 3
        };

        const response = await nango.post(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'subscription_failed',
                message: 'Failed to create watch subscription for calendar settings'
            });
        }

        return {
            kind: response.data.kind,
            channelId: response.data.id,
            resourceId: response.data.resourceId,
            resourceUri: response.data.resourceUri,
            channelToken: response.data.token || undefined,
            expiration: response.data.expiration || undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
