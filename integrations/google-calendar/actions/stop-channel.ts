import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        id: z.string().describe('The channel ID returned when the channel was created. Example: "test-channel-12345"'),
        resourceId: z.string().describe('The opaque resource ID returned when the channel was created. Example: "YbJ8bUochj7xzKeEPV5iSw7J24Q"'),
        token: z.string().optional().describe('An arbitrary token delivered to the target address with each notification. Optional.')
    })
    .describe('Parameters required to stop an active push notification channel.');

const OutputSchema = z.object({}).describe('Empty response confirming the channel was stopped.');

/**
 * @tags: [write, destructive]
 * @tagReason: Stops and invalidates an active push notification channel. This is a destructive operation that cannot be reversed for the same channel ID.
 * @pitfalls: Stopping a channel is irreversible and the same channel ID cannot be reused; calling stop on an already-stopped or nonexistent channel returns a 404.
 */
const action = createAction({
    description: 'Stop push notifications for a channel',
    version: '1.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.google.com/workspace/calendar/api/v3/reference/channels/stop
            endpoint: '/calendar/v3/channels/stop',
            data: {
                id: input.id,
                resourceId: input.resourceId,
                ...(input.token !== undefined && { token: input.token })
            },
            retries: 3
        };

        await nango.post(config);

        return {};
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
