import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    channel_id: z.string().describe('The ID of the channel to rename. Example: "C0123456789"'),
    channel_name: z
        .string()
        .describe(
            'The new name for the channel. Names must be 80 characters or less, and can only contain lowercase letters, numbers, hyphens, and underscores. Example: "general"'
        )
});

const OutputSchema = z.object({
    id: z.string().describe('Channel ID'),
    name: z.string().describe('Channel name'),
    is_channel: z.boolean().optional().describe('Whether this is a channel'),
    is_group: z.boolean().optional().describe('Whether this is a group'),
    is_im: z.boolean().optional().describe('Whether this is an IM'),
    created: z.number().optional().describe('Unix timestamp when the channel was created'),
    creator: z.string().optional().describe('User ID of the channel creator'),
    is_archived: z.boolean().optional().describe('Whether the channel is archived'),
    is_general: z.boolean().optional().describe('Whether this is the general channel'),
    is_private: z.boolean().optional().describe('Whether the channel is private'),
    is_member: z.boolean().optional().describe('Whether the caller is a member'),
    num_members: z.number().optional().describe('Number of members in the channel'),
    topic: z
        .object({
            value: z.string().optional(),
            creator: z.string().optional(),
            last_set: z.number().optional()
        })
        .optional(),
    purpose: z
        .object({
            value: z.string().optional(),
            creator: z.string().optional(),
            last_set: z.number().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Rename a Slack channel',
    version: '2.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/rename-channel',
        group: 'Conversations'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['channels:manage', 'channels:write', 'groups:write', 'mpim:write', 'im:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.slack.dev/reference/methods/conversations.rename
        const response = await nango.post({
            endpoint: 'conversations.rename',
            data: {
                channel: input.channel_id,
                name: input.channel_name
            },
            retries: 3
        });

        if (!response.data?.ok) {
            throw new nango.ActionError({
                type: 'api_error',
                message: response.data?.error || 'Failed to rename channel',
                response: response.data
            });
        }

        const channel = response.data.channel;

        return {
            id: channel.id,
            name: channel.name,
            is_channel: channel.is_channel ?? undefined,
            is_group: channel.is_group ?? undefined,
            is_im: channel.is_im ?? undefined,
            created: channel.created ?? undefined,
            creator: channel.creator ?? undefined,
            is_archived: channel.is_archived ?? undefined,
            is_general: channel.is_general ?? undefined,
            is_private: channel.is_private ?? undefined,
            is_member: channel.is_member ?? undefined,
            num_members: channel.num_members ?? undefined,
            topic: channel.topic
                ? {
                      value: channel.topic.value ?? undefined,
                      creator: channel.topic.creator ?? undefined,
                      last_set: channel.topic.last_set ?? undefined
                  }
                : undefined,
            purpose: channel.purpose
                ? {
                      value: channel.purpose.value ?? undefined,
                      creator: channel.purpose.creator ?? undefined,
                      last_set: channel.purpose.last_set ?? undefined
                  }
                : undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
