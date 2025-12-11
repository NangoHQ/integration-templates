/**
 * Instructions: Posts a message to a public channel private channel or direct message.
 * API: https://api.slack.com/methods/chat.postMessage
 */

import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

// Inline schema definitions
const PostMessageInput = z.object({
    channel_id: z.string().describe('Channel, DM, or group to post to. Example: "C02MB5ZABA7"'),
    text: z.string().describe('Message text content. Supports Slack markdown. Example: "Hello *world*!"'),
    thread_ts: z.string().optional().describe('Parent message timestamp to reply in thread. Omit for top-level message. Example: "1763887648.424429"'),
    blocks: z.array(z.any()).optional().describe('Slack Block Kit blocks for rich formatting. See: https://api.slack.com/block-kit')
});

const MessageObject = z.object({
    text: z.string().describe('The message text as stored'),
    type: z.string().describe('Message type, typically "message"'),
    user: z.string().describe('User ID who posted. Example: "U07E8G7J57T"')
});

const PostMessageOutput = z.object({
    ok: z.boolean().describe('Whether the message was posted successfully'),
    ts: z.string().describe('Timestamp of the posted message. Example: "1763887648.424429"'),
    channel: z.string().describe('Channel where message was posted. Example: "C02MB5ZABA7"'),
    message: MessageObject
});

const action = createAction({
    description: 'Posts a message to a public channel, private channel, or direct message.',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/messages/post',
        group: 'Messages'
    },

    input: PostMessageInput,
    output: PostMessageOutput,
    scopes: ['chat:write'],

    exec: async (nango, input): Promise<z.infer<typeof PostMessageOutput>> => {
        const config: ProxyConfiguration = {
            // https://api.slack.com/methods/chat.postMessage
            endpoint: 'chat.postMessage',
            data: {
                channel: input.channel_id,
                text: input.text,
                ...(input.thread_ts && { thread_ts: input.thread_ts }),
                ...(input.blocks && { blocks: input.blocks })
            },
            retries: 3
        };

        const response = await nango.post(config);

        return {
            ok: response.data.ok,
            ts: response.data.ts,
            channel: response.data.channel,
            message: {
                text: response.data.message.text,
                type: response.data.message.type,
                user: response.data.message.user
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
