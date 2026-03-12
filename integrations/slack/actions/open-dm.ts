import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    user_ids: z
        .array(z.string())
        .min(1)
        .describe(
            'User IDs to open a direct message with. For a 1:1 DM, provide a single user ID. For a multi-person DM, provide multiple user IDs. Example: ["U1234567890"]'
        )
});

const OutputSchema = z.object({
    channel_id: z.string().describe('The ID of the opened DM channel'),
    channel_name: z.string().describe('The name of the channel (for multi-person DMs this will be a generated name)')
});

const action = createAction({
    description: 'Open a direct or multi-person DM for specified users',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/open-dm',
        group: 'Conversations'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['im:write', 'mpim:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://api.slack.com/methods/conversations.open
        const response = await nango.post({
            endpoint: 'conversations.open',
            data: {
                users: input.user_ids.join(',')
            },
            retries: 3
        });

        if (!response.data.ok) {
            throw new nango.ActionError({
                type: 'slack_api_error',
                message: response.data.error || 'Failed to open DM',
                user_ids: input.user_ids
            });
        }

        return {
            channel_id: response.data.channel.id,
            channel_name: response.data.channel.name || 'direct-message'
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
