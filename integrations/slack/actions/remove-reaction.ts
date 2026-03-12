import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    channel_id: z.string().describe('Channel ID where the message was posted. Example: "C1234567890"'),
    timestamp: z.string().describe('Timestamp of the message to remove the reaction from. Example: "1234567890.123456"'),
    reaction_name: z.string().describe('Name of the emoji reaction to remove. Example: "thumbsup"')
});

const OutputSchema = z.object({
    ok: z.boolean().describe('Whether the operation was successful'),
    error: z.union([z.string(), z.null()]).describe('Error message if the operation failed')
});

const action = createAction({
    description: 'Remove an emoji reaction from a specific message',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/remove-reaction',
        group: 'Reactions'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['reactions:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://api.slack.com/methods/reactions.remove
        const response = await nango.post({
            endpoint: 'reactions.remove',
            data: {
                channel: input.channel_id,
                timestamp: input.timestamp,
                name: input.reaction_name
            },
            retries: 10
        });

        if (!response.data || response.data.ok !== true) {
            return {
                ok: false,
                error: response.data?.error || 'Unknown error'
            };
        }

        return {
            ok: true,
            error: null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
