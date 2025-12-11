/**
 * Instructions: Removes a message from a conversation.
 * API: https://api.slack.com/methods/chat.delete
 */

import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

// Inline schema definitions
const DeleteMessageInput = z.object({
    channel_id: z.string().describe('The channel containing the message. Example: "C02MB5ZABA7"'),
    message_ts: z.string().describe('Timestamp of the message to delete. Example: "1764187268.105539"')
});

const DeleteMessageOutput = z.object({
    ok: z.boolean().describe('Whether the message was deleted successfully'),
    ts: z.string().describe('Timestamp of the deleted message'),
    channel: z.string().describe('Channel where the message was deleted')
});

const action = createAction({
    description: 'Removes a message from a conversation.',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/messages/delete',
        group: 'Messages'
    },

    input: DeleteMessageInput,
    output: DeleteMessageOutput,
    scopes: ['chat:write'],

    exec: async (nango, input): Promise<z.infer<typeof DeleteMessageOutput>> => {
        const config: ProxyConfiguration = {
            // https://api.slack.com/methods/chat.delete
            endpoint: 'chat.delete',
            data: {
                channel: input.channel_id,
                ts: input.message_ts
            },
            retries: 3
        };

        const response = await nango.post(config);

        return {
            ok: response.data.ok,
            ts: response.data.ts,
            channel: response.data.channel
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
