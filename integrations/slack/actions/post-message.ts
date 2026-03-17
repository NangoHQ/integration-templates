import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    channel: z.string().describe('Channel, private group, or IM channel ID to send message to. Example: "C1234567890"'),
    text: z.string().describe('Text of the message to send'),
    thread_ts: z.string().optional().describe('Timestamp of parent message to reply in thread. Example: "1234567890.123456"')
});

const OutputSchema = z.object({
    ok: z.boolean().describe('Whether the API request succeeded'),
    channel: z.string().describe('ID of the channel the message was sent to'),
    ts: z.string().describe('Timestamp of the sent message'),
    message: z
        .object({
            type: z.string().describe('Message type'),
            subtype: z.string().optional().describe('Message subtype'),
            text: z.string().describe('Text of the message'),
            ts: z.string().describe('Timestamp of the message'),
            username: z.string().optional().describe('Username of the sender'),
            bot_id: z.string().optional().describe('ID of the bot if sent by bot')
        })
        .describe('The message object that was sent')
});

const action = createAction({
    description: 'Post a message to a channel, DM, or thread',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/post-message',
        group: 'Messaging'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['chat:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const payload: { channel: string; text: string; thread_ts?: string } = {
            channel: input.channel,
            text: input.text
        };

        if (input.thread_ts) {
            payload.thread_ts = input.thread_ts;
        }

        const response = await nango.post({
            endpoint: 'chat.postMessage',
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
            channel: response.data.channel,
            ts: response.data.ts,
            message: {
                type: response.data.message.type,
                subtype: response.data.message.subtype || undefined,
                text: response.data.message.text,
                ts: response.data.message.ts,
                username: response.data.message.username || undefined,
                bot_id: response.data.message.bot_id || undefined
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
