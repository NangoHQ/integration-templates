import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    channel: z.string().describe('The channel ID the scheduled message is posting to. Example: "C123456789"'),
    scheduled_message_id: z.string().describe('The scheduled_message_id returned from chat.scheduleMessage. Example: "Q1234ABCD"')
});

const OutputSchema = z.object({
    ok: z.boolean().describe('Whether the operation was successful')
});

const action = createAction({
    description: 'Cancel a scheduled message',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/delete-scheduled-message',
        group: 'Messages'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['chat:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://api.slack.com/methods/chat.deleteScheduledMessage
            endpoint: 'chat.deleteScheduledMessage',
            data: {
                channel: input.channel,
                scheduled_message_id: input.scheduled_message_id
            },
            retries: 3
        });

        if (!response.data.ok) {
            throw new nango.ActionError({
                type: 'slack_error',
                message: response.data.error || 'Unknown error deleting scheduled message',
                error: response.data.error
            });
        }

        return {
            ok: response.data.ok
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
