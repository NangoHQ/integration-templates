import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    channel_id: z.string().describe('The channel ID where the message is located. Example: "C1234567890"'),
    timestamp: z.string().describe('The timestamp of the message to react to. Example: "1234567890.123456"'),
    emoji_name: z.string().describe('The name of the emoji to use (without colons). Example: "thumbsup"')
});

const OutputSchema = z.object({
    ok: z.boolean()
});

const action = createAction({
    description: 'Add an emoji reaction to a specific Slack message',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/add-reaction',
        group: 'Reactions'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['reactions:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://api.slack.com/methods/reactions.add
        const response = await nango.post({
            endpoint: 'reactions.add',
            data: {
                channel: input.channel_id,
                timestamp: input.timestamp,
                name: input.emoji_name
            },
            retries: 10 // Do not retry non-idempotent writes
        });

        if (!response.data.ok) {
            throw new nango.ActionError({
                type: 'slack_api_error',
                message: response.data.error || 'Failed to add reaction',
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
