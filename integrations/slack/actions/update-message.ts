/**
 * Instructions: Modifies an existing message in a channel.
 * API: https://api.slack.com/methods/chat.update
 */

import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

// Inline schema definitions
const UpdateMessageInput = z.object({
    channel_id: z.string()
        .describe('The channel containing the message. Example: "C02MB5ZABA7"'),
    message_ts: z.string()
        .describe('Timestamp of the message to update. Example: "1234567890.123456"'),
    text: z.string().optional()
        .describe('New message text. Example: "Updated message content"'),
    blocks: z.array(z.any()).optional()
        .describe('Array of Block Kit blocks for rich formatting')
});

const UpdateMessageOutput = z.object({
    ok: z.boolean()
        .describe('Whether the request was successful'),
    ts: z.string()
        .describe('Timestamp of the updated message'),
    channel: z.string()
        .describe('Channel where the message was updated'),
    text: z.string()
        .describe('The updated message text')
});

const action = createAction({
    description: 'Modifies an existing message in a channel.',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/messages/update',
        group: 'Messages'
    },

    input: UpdateMessageInput,
    output: UpdateMessageOutput,
    scopes: ['chat:write'],

    exec: async (nango, input): Promise<z.infer<typeof UpdateMessageOutput>> => {
        const config: ProxyConfiguration = {
            // https://api.slack.com/methods/chat.update
            endpoint: 'chat.update',
            data: {
                channel: input.channel_id,
                ts: input.message_ts,
                ...(input.text && { text: input.text }),
                ...(input.blocks && { blocks: input.blocks })
            },
            retries: 3
        };

        const response = await nango.post(config);

        return {
            ok: response.data.ok,
            ts: response.data.ts,
            channel: response.data.channel,
            text: response.data.text
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
