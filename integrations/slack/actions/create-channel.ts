import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z
        .string()
        .describe('Name of the channel to create. Must be lowercase, contain only letters, numbers, hyphens, and underscores, and be 80 characters or less.'),
    is_private: z.boolean().optional().describe('Whether the channel should be private. Defaults to false (public channel).')
});

const OutputSchema = z.object({
    id: z.string().describe('The unique identifier of the channel.'),
    name: z.string().describe('The normalized name of the channel.'),
    is_private: z.boolean().describe('Whether the channel is private.'),
    is_channel: z.boolean().describe('Whether this is a channel.'),
    created: z.number().describe('Unix timestamp when the channel was created.'),
    creator: z.string().describe('User ID of the channel creator.')
});

const action = createAction({
    description: 'Create a new public or private Slack channel by name; does not create DMs or other conversation types.',
    version: '2.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/create-channel',
        group: 'Conversations'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['channels:manage', 'channels:write', 'groups:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://api.slack.com/methods/conversations.create
        const response = await nango.post({
            endpoint: 'conversations.create',
            data: {
                name: input.name,
                is_private: input.is_private ?? false
            },
            retries: 3
        });

        if (!response.data || !response.data.ok) {
            const error = response.data?.error || 'Unknown error';
            throw new nango.ActionError({
                type: 'api_error',
                message: `Failed to create conversation: ${error}`,
                error: error
            });
        }

        const channel = response.data.channel;

        return {
            id: channel.id,
            name: channel.name,
            is_private: channel.is_private,
            is_channel: channel.is_channel,
            created: channel.created,
            creator: channel.creator
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
