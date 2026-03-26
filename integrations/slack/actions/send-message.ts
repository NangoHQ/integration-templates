import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    channel_id: z.string().describe('Channel ID to send the message to. Example: "C1234567890"'),
    text: z.string().describe('Text content of the message to send. Example: "Hello world"')
});

const OutputSchema = z.object({
    ok: z.boolean(),
    channel: z.string(),
    ts: z.string().describe('Timestamp ID of the sent message'),
    message: z
        .object({
            type: z.string(),
            user: z.string(),
            text: z.string(),
            ts: z.string(),
            team: z.string().optional(),
            bot_id: z.string().optional(),
            app_id: z.string().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Send a message to a channel',
    version: '3.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/send-message',
        group: 'Messages'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['chat:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://api.slack.com/methods/chat.postMessage
        const response = await nango.post({
            endpoint: 'chat.postMessage',
            data: {
                channel: input.channel_id,
                text: input.text
            },
            retries: 3
        });

        if (!response.data || !response.data.ok) {
            throw new nango.ActionError({
                type: 'slack_error',
                message: response.data?.error || 'Failed to send message',
                response: response.data
            });
        }

        const message = response.data.message;

        return {
            ok: response.data.ok,
            channel: response.data.channel,
            ts: response.data.ts,
            message: message
                ? {
                      type: message.type,
                      user: message.user,
                      text: message.text,
                      ts: message.ts,
                      team: message.team,
                      bot_id: message.bot_id,
                      app_id: message.app_id
                  }
                : undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
