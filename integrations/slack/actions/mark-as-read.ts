import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    channel_id: z.string().describe('The channel ID to mark as read. Example: "C02MB5ZABA7"'),
    message_ts: z.string().describe('Timestamp of the message to mark as read. Example: "1234567890.123456"')
});

const OutputSchema = z.object({
    ok: z.boolean().describe('Whether the operation succeeded')
});

const action = createAction({
    description: "Move a conversation's read cursor to a specific message timestamp",
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/mark-as-read',
        group: 'Conversations'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['channels:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config = {
            // https://api.slack.com/methods/conversations.mark
            endpoint: 'conversations.mark',
            data: {
                channel: input.channel_id,
                ts: input.message_ts
            },
            retries: 3
        };

        const response = await nango.post(config);

        if (!response.data.ok) {
            throw new nango.ActionError({
                type: 'slack_error',
                message: response.data.error || 'Failed to mark conversation as read',
                channel_id: input.channel_id,
                message_ts: input.message_ts
            });
        }

        return {
            ok: response.data.ok
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
