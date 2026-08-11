import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.string().describe('A UUID or similar unique string that identifies this channel. Example: "01234567-89ab-cdef-0123456789ab"'),
        address: z.string().describe('The address where notifications are delivered for this channel. Example: "https://example.com/webhook"'),
        token: z
            .string()
            .optional()
            .describe('An arbitrary string delivered to the target address with each notification delivered over this channel. Optional.'),
        ttl: z.number().optional().describe('The time-to-live in seconds for the notification channel. Default is 604800 seconds (7 days).')
    })
    .describe('Input parameters for subscribing to calendar list changes.');

const OutputSchema = z
    .object({
        kind: z.string().describe('Identifies this as a notification channel. Value is "api#channel".'),
        id: z.string().describe('A UUID or similar unique string that identifies this channel.'),
        resourceId: z.string().describe('An opaque ID that identifies the resource being watched on this channel. Stable across different API versions.'),
        resourceUri: z.string().describe('A version-specific identifier for the watched resource.'),
        token: z
            .string()
            .optional()
            .describe('An arbitrary string delivered to the target address with each notification delivered over this channel. Optional.'),
        expiration: z
            .number()
            .optional()
            .describe('Date and time of notification channel expiration, expressed as a Unix timestamp, in milliseconds. Optional.')
    })
    .describe('Output of a calendar list watch subscription.');

const ProviderResponseSchema = z.object({
    kind: z.string(),
    id: z.string(),
    resourceId: z.string(),
    resourceUri: z.string(),
    token: z.string().optional(),
    expiration: z.union([z.string(), z.number()]).optional()
});

/**
 * @tags: [write]
 * @tagReason: Creates a new push notification channel on the provider.
 * @pitfalls: Reusing a channel id causes a provider error; channels expire automatically after the TTL and are not renewed, so callers must create replacements with new unique ids before expiration.
 */
const action = createAction({
    description: 'Subscribe to changes in the calendar list',
    version: '1.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, unknown> = {
            id: input.id,
            type: 'web_hook',
            address: input.address
        };

        if (input.token !== undefined) {
            requestBody['token'] = input.token;
        }

        if (input.ttl !== undefined) {
            requestBody['params'] = {
                ttl: input.ttl.toString()
            };
        }

        // https://developers.google.com/workspace/calendar/api/v3/reference/calendarList/watch
        const response = await nango.post({
            endpoint: '/calendar/v3/users/me/calendarList/watch',
            data: requestBody,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            kind: providerResponse.kind,
            id: providerResponse.id,
            resourceId: providerResponse.resourceId,
            resourceUri: providerResponse.resourceUri,
            ...(providerResponse.token != null && { token: providerResponse.token }),
            ...(providerResponse.expiration != null && { expiration: Number(providerResponse.expiration) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
