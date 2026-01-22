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

const SlackReactionSchema = z.object({
    name: z.string(),
    users: z.array(z.string()),
    count: z.number()
});

const SlackFileSchema = z.object({
    id: z.string(),
    created: z.number().optional(),
    timestamp: z.number().optional(),
    name: z.string().optional(),
    title: z.string().optional(),
    mimetype: z.string().optional(),
    filetype: z.string().optional(),
    pretty_type: z.string().optional(),
    user: z.string().optional(),
    user_team: z.string().optional(),
    size: z.number().optional(),
    mode: z.string().optional(),
    is_external: z.boolean().optional(),
    is_public: z.boolean().optional(),
    url_private: z.string().optional(),
    url_private_download: z.string().optional(),
    permalink: z.string().optional(),
    permalink_public: z.string().optional()
});

const SlackBlockElementSchema = z.object({
    type: z.string(),
    text: z.string().optional(),
    url: z.string().optional(),
    channel_id: z.string().optional()
});

const SlackBlockSchema = z.object({
    type: z.string(),
    block_id: z.string().optional(),
    elements: z
        .array(
            z.object({
                type: z.string(),
                elements: z.array(SlackBlockElementSchema).optional()
            })
        )
        .optional()
});

const SlackMessageSchema = z.object({
    type: z.string(),
    text: z.string().optional(),
    user: z.string().optional(),
    ts: z.string().optional(),
    thread_ts: z.string().optional(),
    team: z.string().optional(),
    client_msg_id: z.string().optional(),
    subtype: z.string().optional(),
    blocks: z.array(SlackBlockSchema).optional(),
    files: z.array(SlackFileSchema).optional(),
    reactions: z.array(SlackReactionSchema).optional(),
    reply_count: z.number().optional(),
    reply_users_count: z.number().optional(),
    reply_users: z.array(z.string()).optional(),
    latest_reply: z.string().optional(),
    is_locked: z.boolean().optional(),
    subscribed: z.boolean().optional()
});

const GetThreadRepliesOutput = z.object({
    ok: z.boolean().describe('Whether the request was successful'),
    messages: z.array(SlackMessageSchema).describe('Array of message objects in the thread'),
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
