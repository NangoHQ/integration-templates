/**
 * Instructions: Moves the read cursor in a conversation
 * API: https://api.slack.com/methods/conversations.mark
 */

import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

// Inline schema definitions
const MarkAsReadInput = z.object({
    channel_id: z.string().describe('The channel to mark as read. Example: "C02MB5ZABA7"'),
    message_ts: z.string().describe('Timestamp of the message to mark as read. Example: "1234567890.123456"')
});

const MarkAsReadOutput = z.object({
    ok: z.boolean().describe('Whether the request was successful')
});

const action = createAction({
    description: 'Moves the read cursor in a conversation.',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/channels/mark',
        group: 'Channels'
    },

    input: MarkAsReadInput,
    output: MarkAsReadOutput,
    scopes: ['channels:write', 'groups:write', 'im:write', 'mpim:write'],

    exec: async (nango, input): Promise<z.infer<typeof MarkAsReadOutput>> => {
        const config: ProxyConfiguration = {
            // https://api.slack.com/methods/conversations.mark
            endpoint: 'conversations.mark',
            data: {
                channel: input.channel_id,
                ts: input.message_ts
            },
            retries: 3
        };

        const response = await nango.post(config);

        return {
            ok: response.data.ok
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
