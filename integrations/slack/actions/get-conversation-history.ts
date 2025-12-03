/**
 * Instructions: Fetches message history from a channel or conversation.
 * API: https://api.slack.com/methods/conversations.history
 */

import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

// Inline schema definitions
const GetConversationHistoryInput = z.object({
    channel_id: z.string()
        .describe('The channel to fetch history from. Example: "C02MB5ZABA7"'),
    limit: z.number().optional()
        .describe('Number of messages to return. Default: 100, max: 1000'),
    cursor: z.string().optional()
        .describe('Pagination cursor from previous response'),
    oldest_ts: z.string().optional()
        .describe('Only messages after this timestamp. Example: "1234567890.123456"'),
    latest_ts: z.string().optional()
        .describe('Only messages before this timestamp. Example: "1234567890.123456"')
});

const GetConversationHistoryOutput = z.object({
    ok: z.boolean()
        .describe('Whether the request was successful'),
    messages: z.array(z.any())
        .describe('Array of message objects'),
    has_more: z.boolean()
        .describe('Whether there are more messages to fetch'),
    next_cursor: z.union([z.string(), z.null()])
        .describe('Cursor for next page, null if no more pages')
});

const action = createAction({
    description: 'Fetches message history from a channel or conversation.',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/conversations/history',
        group: 'Channels'
    },

    input: GetConversationHistoryInput,
    output: GetConversationHistoryOutput,
    scopes: ['channels:history'],

    exec: async (nango, input): Promise<z.infer<typeof GetConversationHistoryOutput>> => {
        const config: ProxyConfiguration = {
            // https://api.slack.com/methods/conversations.history
            endpoint: 'conversations.history',
            params: {
                channel: input.channel_id,
                ...(input.limit && { limit: input.limit.toString() }),
                ...(input.cursor && { cursor: input.cursor }),
                ...(input.oldest_ts && { oldest: input.oldest_ts }),
                ...(input.latest_ts && { latest: input.latest_ts })
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
