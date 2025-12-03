/**
 * Instructions: Pins a message to a channel
 * API: https://api.slack.com/methods/pins.add
 */
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const Input = z.object({
    channel_id: z.string()
        .describe('The channel containing the message. Example: "C02MB5ZABA7"'),
    message_ts: z.string()
        .describe('Timestamp of the message to pin. Example: "1234567890.123456"')
});

const Output = z.object({
    ok: z.boolean()
        .describe('Whether the request was successful')
});

const action = createAction({
    description: 'Pins a message to a channel.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/pin-message',
        group: 'Actions'
    },
    input: Input,
    output: Output,
    scopes: ['pins:write'],
    exec: async (nango, input): Promise<z.infer<typeof Output>> => {
        const config: ProxyConfiguration = {
            endpoint: 'pins.add',
            data: {
                channel: input.channel_id,
                timestamp: input.message_ts
            },
            retries: 3
        };
        const response = await nango.post(config);
        return { ok: response.data.ok };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
