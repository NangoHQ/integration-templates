/**
 * Instructions: Fetches message history from a channel or conversation.
 * API: https://api.slack.com/methods/conversations.history
 */

import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

// Inline schema definitions
const GetConversationHistoryInput = z.object({
    channel_id: z.string().describe('The channel to fetch history from. Example: "C02MB5ZABA7"'),
    limit: z.number().optional().describe('Number of messages to return. Default: 100, max: 1000'),
    cursor: z.string().optional().describe('Pagination cursor from previous response'),
    oldest_ts: z.string().optional().describe('Only messages after this timestamp. Example: "1234567890.123456"'),
    latest_ts: z.string().optional().describe('Only messages before this timestamp. Example: "1234567890.123456"')
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

const SlackAttachmentSchema = z.object({
    id: z.number().optional(),
    fallback: z.string().optional(),
    text: z.string().optional(),
    title: z.string().optional(),
    title_link: z.string().optional(),
    from_url: z.string().optional(),
    original_url: z.string().optional(),
    service_name: z.string().optional(),
    service_icon: z.string().optional(),
    image_url: z.string().optional(),
    image_width: z.number().optional(),
    image_height: z.number().optional(),
    thumb_url: z.string().optional(),
    thumb_width: z.number().optional(),
    thumb_height: z.number().optional()
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
    attachments: z.array(SlackAttachmentSchema).optional(),
    reactions: z.array(SlackReactionSchema).optional(),
    reply_count: z.number().optional(),
    reply_users_count: z.number().optional(),
    reply_users: z.array(z.string()).optional(),
    latest_reply: z.string().optional(),
    is_locked: z.boolean().optional(),
    subscribed: z.boolean().optional(),
    edited: z
        .object({
            user: z.string(),
            ts: z.string()
        })
        .optional(),
    upload: z.boolean().optional(),
    display_as_bot: z.boolean().optional()
});

const GetConversationHistoryOutput = z.object({
    ok: z.boolean().describe('Whether the request was successful'),
    messages: z.array(SlackMessageSchema).describe('Array of message objects'),
    has_more: z.boolean().describe('Whether there are more messages to fetch'),
    next_cursor: z.union([z.string(), z.null()]).describe('Cursor for next page, null if no more pages')
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
