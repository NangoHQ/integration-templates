import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    channel_id: z.string().describe('The conversation ID to fetch history for. Example: "C1234567890"'),
    cursor: z.string().optional().describe('Pagination cursor from previous response. Omit for first page.'),
    oldest: z.string().optional().describe('Only messages after this Unix timestamp will be included. Example: "1512085950.000216"'),
    latest: z.string().optional().describe('Only messages before this Unix timestamp will be included. Example: "1512104434.000490"'),
    inclusive: z.boolean().optional().describe('Include messages with oldest or latest timestamps in results. Defaults to false.'),
    limit: z.number().optional().describe('Maximum number of messages to return (max 999). Defaults to 100.')
});

const MessageSchema = z.object({
    type: z.string(),
    ts: z.string(),
    user: z.string().optional(),
    text: z.string().optional(),
    thread_ts: z.string().optional(),
    reply_count: z.number().optional(),
    reactions: z
        .array(
            z.object({
                name: z.string(),
                count: z.number(),
                users: z.array(z.string())
            })
        )
        .optional(),
    attachments: z.array(z.unknown()).optional()
});

const OutputSchema = z.object({
    messages: z.array(MessageSchema),
    has_more: z.boolean(),
    next_cursor: z.union([z.string(), z.null()]),
    pin_count: z.number().optional()
});

const action = createAction({
    description: 'Fetch paginated message history for a conversation within optional time bounds',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/get-conversation-history',
        group: 'Conversations'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['channels:history', 'groups:history', 'im:history', 'mpim:history'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.slack.dev/reference/methods/conversations.history
        const response = await nango.get({
            endpoint: '/conversations.history',
            params: {
                channel: input.channel_id,
                ...(input.cursor && { cursor: input.cursor }),
                ...(input.oldest && { oldest: input.oldest }),
                ...(input.latest && { latest: input.latest }),
                ...(input.inclusive !== undefined && { inclusive: input.inclusive.toString() }),
                limit: input.limit ?? 100
            },
            retries: 3
        });

        if (!response.data.ok) {
            throw new nango.ActionError({
                type: 'slack_error',
                message: response.data.error || 'Unknown Slack API error',
                channel_id: input.channel_id
            });
        }

        const messages = (response.data.messages || []).map((msg: Record<string, unknown>) => ({
            type: msg['type'] as string,
            ts: msg['ts'] as string,
            user: msg['user'] as string | undefined,
            text: msg['text'] as string | undefined,
            thread_ts: msg['thread_ts'] as string | undefined,
            reply_count: msg['reply_count'] as number | undefined,
            reactions: msg['reactions'] as Array<{ name: string; count: number; users: string[] }> | undefined,
            attachments: msg['attachments'] as unknown[] | undefined
        }));

        return {
            messages,
            has_more: response.data.has_more || false,
            next_cursor: response.data.response_metadata?.next_cursor || null,
            pin_count: response.data.pin_count
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
