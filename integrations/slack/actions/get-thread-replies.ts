import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    channel_id: z.string().describe('The ID of the channel/conversation containing the thread. Example: "C1234567890"'),
    thread_ts: z.string().describe('The timestamp of the parent message in the thread. Example: "1234567890.123456"'),
    cursor: z.string().optional().describe('Pagination cursor from previous response. Omit for first page.'),
    limit: z.number().min(1).max(100).optional().describe('Maximum number of messages to return per page. Default: 100.')
});

const MessageSchema = z.object({
    type: z.string(),
    user: z.string().optional(),
    text: z.string(),
    ts: z.string(),
    thread_ts: z.string().optional(),
    reply_count: z.number().optional(),
    reply_users_count: z.number().optional(),
    reply_users: z.array(z.string()).optional()
});

const OutputSchema = z.object({
    messages: z.array(MessageSchema).describe('Array of messages in the thread, including parent and replies'),
    next_cursor: z.string().optional().describe('Pagination cursor for next page. Omitted if no more pages.'),
    has_more: z.boolean().describe('Whether there are more messages to fetch')
});

const action = createAction({
    description: 'Fetch paginated thread replies and parent message for a conversation thread',
    version: '2.0.0',

    endpoint: {
        method: 'GET',
        path: '/actions/get-thread-replies',
        group: 'Messages'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['channels:history', 'groups:history', 'im:history', 'mpim:history'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://api.slack.com/methods/conversations.replies
        const response = await nango.get({
            endpoint: 'conversations.replies',
            params: {
                channel: input.channel_id,
                ts: input.thread_ts,
                ...(input.cursor && { cursor: input.cursor }),
                ...(input.limit && { limit: String(input.limit) })
            },
            retries: 3
        });

        if (!response.data || response.data.ok === false) {
            throw new nango.ActionError({
                type: 'slack_api_error',
                message: response.data?.error || 'Failed to fetch thread replies',
                channel_id: input.channel_id,
                thread_ts: input.thread_ts
            });
        }

        const messages = (response.data.messages || []).map((msg: any) => ({
            type: msg.type || 'message',
            user: msg.user || undefined,
            text: msg.text || '',
            ts: msg.ts,
            thread_ts: msg.thread_ts || undefined,
            reply_count: msg.reply_count,
            reply_users_count: msg.reply_users_count,
            reply_users: msg.reply_users
        }));

        return {
            messages,
            next_cursor: response.data.response_metadata?.next_cursor || undefined,
            has_more: response.data.has_more || false
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
