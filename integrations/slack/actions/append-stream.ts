import { z } from 'zod';
import { createAction } from 'nango';

interface SlackAppendStreamResponse {
    ok: boolean;
    channel?: string;
    ts?: string;
    error?: string;
}

const InputSchema = z.object({
    channel: z.string().describe('Channel or IM channel ID the stream is in. Must match the channel used in start-stream. Example: "D1234567890"'),
    ts: z.string().describe('Timestamp of the streamed message, as returned by start-stream. Example: "1234567890.123456"'),
    markdown_text: z.string().max(12000).optional().describe('Additional message text in markdown, up to 12,000 characters. Mutually exclusive with chunks.'),
    chunks: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe(
            'Additional streaming chunks (markdown text, task updates, plan updates, or blocks - blocks chunks capped at 50 blocks, task_update/plan_update chunks capped at 256 chars). Mutually exclusive with markdown_text. Must use the same streaming mode (markdown_text vs chunks) as the start-stream call that opened this message.'
        )
});

const OutputSchema = z.object({
    ok: z.boolean().describe('Whether the API request succeeded'),
    channel: z.string().describe('ID of the channel the stream is in'),
    ts: z.string().describe('Timestamp of the streamed message')
});

const action = createAction({
    description: 'Append another chunk of content to a message previously opened with start-stream.',
    version: '1.0.0',

    input: InputSchema,
    output: OutputSchema,
    scopes: ['chat:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const hasMarkdownText = input.markdown_text !== undefined;
        const hasChunks = input.chunks !== undefined;

        if (hasMarkdownText && hasChunks) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'markdown_text and chunks are mutually exclusive - provide only one.'
            });
        }
        if (!hasMarkdownText && !hasChunks) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'One of markdown_text or chunks is required - there is no content to append otherwise.'
            });
        }

        const payload: Record<string, unknown> = {
            channel: input.channel,
            ts: input.ts
        };

        if (hasMarkdownText) payload['markdown_text'] = input.markdown_text;
        if (hasChunks) payload['chunks'] = input.chunks;

        // https://docs.slack.dev/reference/methods/chat.appendStream
        const response = await nango.post<SlackAppendStreamResponse>({
            endpoint: 'chat.appendStream',
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

        return {
            ok: response.data.ok,
            channel: response.data.channel ?? input.channel,
            ts: response.data.ts ?? input.ts
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
