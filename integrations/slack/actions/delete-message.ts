import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    channel_id: z.string().describe('Channel ID containing the message. Example: "C1234567890"'),
    message_ts: z.string().describe('Timestamp of the message to delete. Example: "1405894322.002768"')
});

const OutputSchema = z.object({
    ok: z.boolean(),
    channel: z.string(),
    ts: z.string()
});

const action = createAction({
    description: 'Delete a message from a channel',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/delete-message',
        group: 'Messages'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['chat:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://api.slack.com/methods/chat.delete
            endpoint: 'chat.delete',
            data: {
                channel: input.channel_id,
                ts: input.message_ts
            },
            retries: 3
        });

        if (!response.data.ok) {
            throw new nango.ActionError({
                type: 'slack_api_error',
                message: response.data.error || 'Failed to delete message',
                error: response.data.error
            });
        }

        return {
            ok: response.data.ok,
            channel: response.data.channel,
            ts: response.data.ts
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
