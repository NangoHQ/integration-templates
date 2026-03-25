import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    channel_id: z.string().describe('The ID of the channel to remove the user from. Example: "C1234567890"'),
    user_id: z.string().describe('The ID of the user to remove from the channel. Example: "U1234567890"')
});

const OutputSchema = z.object({
    ok: z.boolean(),
    error: z.string().optional()
});

const action = createAction({
    description: 'Remove a user from a channel',
    version: '2.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/remove-from-channel',
        group: 'Conversations'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['channels:manage', 'groups:write', 'im:write', 'mpim:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://api.slack.com/methods/conversations.kick
        const response = await nango.post({
            endpoint: 'conversations.kick',
            data: {
                channel: input.channel_id,
                user: input.user_id
            },
            retries: 3
        });

        if (!response.data.ok) {
            throw new nango.ActionError({
                type: 'slack_error',
                message: response.data.error || 'Failed to remove user from channel',
                slack_error: response.data.error
            });
        }

        return {
            ok: response.data.ok,
            error: response.data.error || undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
