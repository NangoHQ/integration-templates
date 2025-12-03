/**
 * Instructions: Gets all reactions for a single message or file
 * API: https://api.slack.com/methods/reactions.get
 */
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const Input = z.object({
    channel_id: z.string()
        .describe('The channel containing the message. Example: "C02MB5ZABA7"'),
    message_ts: z.string()
        .describe('Timestamp of the message to get reactions for. Example: "1234567890.123456"')
});

const Output = z.object({
    ok: z.boolean()
        .describe('Whether the request was successful'),
    type: z.string().optional()
        .describe('The type of item (message or file)'),
    message: z.any().optional()
        .describe('The message object with reactions attached')
});

const action = createAction({
    description: 'Gets all reactions for a single message or file.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/get-reactions',
        group: 'Actions'
    },
    input: Input,
    output: Output,
    scopes: ['reactions:read'],
    exec: async (nango, input): Promise<z.infer<typeof Output>> => {
        const config: ProxyConfiguration = {
            endpoint: 'reactions.get',
            params: {
                channel: input.channel_id,
                timestamp: input.message_ts
            },
            retries: 3
        };
        const response = await nango.get(config);
        return {
            ok: response.data.ok,
            type: response.data.type,
            message: response.data.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
