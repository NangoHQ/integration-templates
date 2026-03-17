import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    channel_id: z.string().describe('Channel ID to set the purpose for. Example: "C1234567890"'),
    purpose: z.string().describe('The new purpose text for the channel.')
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the purpose was successfully updated'),
    channel_id: z.string().describe('The ID of the channel that was updated'),
    purpose: z.string().describe('The new purpose that was set')
});

const action = createAction({
    description: "Update a channel's purpose text for a conversation",
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/set-channel-purpose',
        group: 'Channels'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['chat:write', 'channels:write', 'groups:write', 'im:write', 'mpim:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.slack.dev/reference/methods/conversations.setPurpose/
        const response = await nango.post({
            endpoint: 'conversations.setPurpose',
            data: {
                channel: input.channel_id,
                purpose: input.purpose
            },
            retries: 3
        });

        if (!response.data?.ok) {
            throw new nango.ActionError({
                type: 'api_error',
                message: response.data?.error || 'Failed to set channel purpose',
                channel_id: input.channel_id
            });
        }

        return {
            success: true,
            channel_id: input.channel_id,
            purpose: input.purpose
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
