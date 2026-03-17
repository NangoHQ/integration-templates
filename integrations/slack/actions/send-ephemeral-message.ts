import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    channel_id: z.string().describe('Channel ID to send the ephemeral message to. Example: "C1234567890"'),
    user_id: z.string().describe('User ID to send the ephemeral message to. The user must be in the specified channel. Example: "U1234567890"'),
    text: z.string().describe('Text of the message to send. Supports Slack formatting.'),
    thread_ts: z.string().optional().describe('Thread timestamp to reply to a specific thread. Example: "1234567890.123456"')
});

const OutputSchema = z.object({
    ok: z.boolean(),
    message_ts: z.string(),
    error: z.string().optional()
});

const action = createAction({
    description: 'Send a message visible only to one user in a channel',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/send-ephemeral-message',
        group: 'Messaging'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['chat:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.slack.dev/reference/methods/chat.postEphemeral/
            endpoint: 'chat.postEphemeral',
            data: {
                channel: input.channel_id,
                user: input.user_id,
                text: input.text,
                ...(input.thread_ts && { thread_ts: input.thread_ts })
            },
            retries: 3
        });

        if (!response.data.ok) {
            throw new nango.ActionError({
                type: 'slack_error',
                message: response.data.error || 'Failed to send ephemeral message',
                error: response.data.error
            });
        }

        return {
            ok: response.data.ok,
            message_ts: response.data.message_ts,
            error: response.data.error
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
