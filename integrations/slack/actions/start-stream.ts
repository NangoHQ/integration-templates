import { z } from 'zod';
import { createAction } from 'nango';

interface SlackStartStreamResponse {
    ok: boolean;
    channel?: string;
    ts?: string;
    error?: string;
}

const InputSchema = z.object({
    channel: z.string().describe('Channel or IM channel ID to start the stream in. Example: "D1234567890"'),
    thread_ts: z
        .string()
        .describe(
            'Timestamp of the parent message to stream the reply into. Slack documents this as optional, but confirmed live: omitting it returns "invalid_thread_ts" - a real parent message must exist first (e.g. via post-message) and its ts passed here. Example: "1234567890.123456"'
        ),
    markdown_text: z.string().max(12000).optional().describe('Message text in markdown, up to 12,000 characters. Mutually exclusive with chunks.'),
    chunks: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Streaming content chunks (markdown text, task updates, plan updates, or blocks). Mutually exclusive with markdown_text.'),
    recipient_user_id: z
        .string()
        .optional()
        .describe(
            'User ID receiving the streamed text. Slack docs mark this required for a non-DM channel, but confirmed live that channel type currently returns "channel_type_not_supported" regardless - streaming only works in DM/IM channels today.'
        ),
    recipient_team_id: z.string().optional().describe('Team ID of the recipient. See recipient_user_id note.'),
    task_display_mode: z.enum(['timeline', 'plan']).optional().describe('How tasks display. Defaults to "timeline" if omitted.'),
    icon_emoji: z.string().optional().describe('Emoji to use as the message icon. Requires the chat:write.customize scope. Example: ":robot_face:"'),
    icon_url: z.string().optional().describe('Image URL to use as the message icon. Requires the chat:write.customize scope.'),
    username: z.string().optional().describe('Bot display name to use for this message. Requires the chat:write.customize scope.')
});

const OutputSchema = z.object({
    ok: z.boolean().describe('Whether the API request succeeded'),
    channel: z.string().describe('ID of the channel the stream was started in'),
    ts: z.string().describe('Timestamp of the streamed message - pass this to append-stream and stop-stream to continue it')
});

const action = createAction({
    description:
        'Post a new message and open it for incremental streamed updates (e.g. an AI response typed in over time). Confirmed live: only works in DM/IM channels - public and private channels return channel_type_not_supported.',
    version: '1.0.0',

    input: InputSchema,
    output: OutputSchema,
    scopes: ['chat:write', 'chat:write.customize'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.markdown_text !== undefined && input.chunks !== undefined) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'markdown_text and chunks are mutually exclusive - provide only one.'
            });
        }

        const payload: Record<string, unknown> = {
            channel: input.channel,
            thread_ts: input.thread_ts
        };

        if (input.markdown_text !== undefined) payload['markdown_text'] = input.markdown_text;
        if (input.chunks !== undefined) payload['chunks'] = input.chunks;
        if (input.recipient_user_id !== undefined) payload['recipient_user_id'] = input.recipient_user_id;
        if (input.recipient_team_id !== undefined) payload['recipient_team_id'] = input.recipient_team_id;
        if (input.task_display_mode !== undefined) payload['task_display_mode'] = input.task_display_mode;
        if (input.icon_emoji !== undefined) payload['icon_emoji'] = input.icon_emoji;
        if (input.icon_url !== undefined) payload['icon_url'] = input.icon_url;
        if (input.username !== undefined) payload['username'] = input.username;

        // https://docs.slack.dev/reference/methods/chat.startStream
        const response = await nango.post<SlackStartStreamResponse>({
            endpoint: 'chat.startStream',
            data: payload,
            retries: 3
        });

        if (!response.data.ok) {
            throw new nango.ActionError({
                type: 'slack_api_error',
                message: response.data.error || 'Unknown Slack API error',
                error: response.data.error
            });
        }
        if (!response.data.ts) {
            throw new nango.ActionError({
                type: 'slack_api_error',
                message: 'Slack returned ok:true with no message ts for chat.startStream.'
            });
        }

        return {
            ok: response.data.ok,
            channel: response.data.channel ?? input.channel,
            ts: response.data.ts
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
