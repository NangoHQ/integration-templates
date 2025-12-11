/**
 * Instructions: Retrieves a thread of messages posted as replies to a message.
 * API: https://api.slack.com/methods/conversations.replies
 */

import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

// Inline schema definitions
const GetThreadRepliesInput = z.object({
    channel_id: z.string().describe('The channel containing the thread. Example: "C02MB5ZABA7"'),
    thread_ts: z.string().describe('Timestamp of the parent message. Example: "1234567890.123456"'),
    limit: z.number().optional().describe('Maximum number of replies to return. Default: 100'),
    cursor: z.string().optional().describe('Pagination cursor from previous response')
});

const GetThreadRepliesOutput = z.object({
    ok: z.boolean().describe('Whether the request was successful'),
    messages: z.array(z.any()).describe('Array of message objects in the thread'),
    has_more: z.boolean().describe('Whether there are more replies to fetch'),
    next_cursor: z.union([z.string(), z.null()]).describe('Cursor for next page, null if no more pages')
});

const action = createAction({
    description: 'Retrieves a thread of messages posted as replies to a message.',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/conversations/replies',
        group: 'Channels'
    },

    input: GetThreadRepliesInput,
    output: GetThreadRepliesOutput,
    scopes: ['channels:history'],

    exec: async (nango, input): Promise<z.infer<typeof GetThreadRepliesOutput>> => {
        const config: ProxyConfiguration = {
            // https://api.slack.com/methods/conversations.replies
            endpoint: 'conversations.replies',
            params: {
                channel: input.channel_id,
                ts: input.thread_ts,
                ...(input.limit && { limit: input.limit.toString() }),
                ...(input.cursor && { cursor: input.cursor })
            },
            retries: 3
        };

        const response = await nango.get(config);

        return {
            ok: response.data.ok,
            messages: response.data.messages,
            has_more: response.data.has_more,
            next_cursor: response.data.response_metadata?.next_cursor || null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
