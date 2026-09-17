import { z } from 'zod';
import { createAction } from 'nango';

interface SlackStopStreamResponse {
    ok: boolean;
    channel?: string;
    ts?: string;
    error?: string;
    message?: {
        type: string;
        subtype?: string;
        text: string;
        ts: string;
        bot_id?: string;
        thread_ts?: string;
        streaming_state?: string;
    };
}

const InputSchema = z.object({
    channel: z.string().describe('Channel or IM channel ID the stream is in. Must match the channel used in start-stream. Example: "D1234567890"'),
    ts: z.string().describe('Timestamp of the streamed message, as returned by start-stream. Example: "1234567890.123456"'),
    markdown_text: z.string().max(12000).optional().describe('Final message text in markdown, up to 12,000 characters. Mutually exclusive with chunks.'),
    chunks: z.array(z.record(z.string(), z.unknown())).optional().describe('Final streaming chunks. Mutually exclusive with markdown_text.'),
    blocks: z.array(z.record(z.string(), z.unknown())).optional().describe('Block objects rendered at the bottom of the finalized message.'),
    metadata: z.record(z.string(), z.unknown()).optional().describe('JSON object of event metadata to attach to the finalized message.'),
    session_status: z
        .enum(['active', 'processing', 'suspended', 'closed'])
        .optional()
        .describe(
            'Status of the stream session after this call. Slack defaults this to "active" (not "closed") when omitted - confirmed live. Pass "closed" explicitly to actually end the stream rather than just pause it.'
        )
});

const OutputSchema = z.object({
    ok: z.boolean().describe('Whether the API request succeeded'),
    channel: z.string().describe('ID of the channel the stream was in'),
    ts: z.string().describe('Timestamp of the finalized message'),
    message: z
        .object({
            type: z.string().describe('Message type'),
            subtype: z.string().optional().describe('Message subtype'),
            text: z.string().describe('Final text of the message'),
            ts: z.string().describe('Timestamp of the message'),
            bot_id: z.string().optional().describe('ID of the bot that sent the message'),
            thread_ts: z.string().optional().describe('Timestamp of the parent thread message'),
            streaming_state: z.string().optional().describe('Final streaming state, e.g. "completed"')
        })
        .describe('The finalized message object')
});

const action = createAction({
    description: 'Finalize a streamed message, optionally attaching closing blocks/metadata and setting its session status.',
    version: '1.0.0',

    input: InputSchema,
    output: OutputSchema,
    scopes: ['chat:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.markdown_text !== undefined && input.chunks !== undefined) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'markdown_text and chunks are mutually exclusive - provide only one.'
            });
        }

        const payload: Record<string, unknown> = {
            channel: input.channel,
            ts: input.ts
        };

        if (input.markdown_text !== undefined) payload['markdown_text'] = input.markdown_text;
        if (input.chunks !== undefined) payload['chunks'] = input.chunks;
        if (input.blocks !== undefined) payload['blocks'] = input.blocks;
        if (input.metadata !== undefined) payload['metadata'] = input.metadata;
        if (input.session_status !== undefined) payload['session_status'] = input.session_status;

        // https://docs.slack.dev/reference/methods/chat.stopStream
        const response = await nango.post<SlackStopStreamResponse>({
            endpoint: 'chat.stopStream',
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
        if (!response.data.message) {
            throw new nango.ActionError({
                type: 'slack_api_error',
                message: 'Slack returned ok:true with no message object for chat.stopStream.'
            });
        }

        return {
            ok: response.data.ok,
            channel: response.data.channel ?? input.channel,
            ts: response.data.ts ?? input.ts,
            message: {
                type: response.data.message.type,
                subtype: response.data.message.subtype || undefined,
                text: response.data.message.text,
                ts: response.data.message.ts,
                bot_id: response.data.message.bot_id || undefined,
                thread_ts: response.data.message.thread_ts || undefined,
                streaming_state: response.data.message.streaming_state || undefined
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
