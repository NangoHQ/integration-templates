import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    channel_id: z.string().describe('Slack channel ID to retrieve information about. Example: "C012AB3CD"')
});

const OutputSchema = z.object({
    id: z.string().describe('Channel ID'),
    name: z.union([z.string(), z.null()]).describe('Channel name'),
    topic: z
        .union([
            z.object({
                value: z.string(),
                creator: z.string(),
                last_set: z.number()
            }),
            z.null()
        ])
        .describe('Channel topic information'),
    purpose: z
        .union([
            z.object({
                value: z.string(),
                creator: z.string(),
                last_set: z.number()
            }),
            z.null()
        ])
        .describe('Channel purpose information'),
    is_channel: z.boolean().describe('Whether this is a public channel'),
    is_group: z.boolean().describe('Whether this is a private channel'),
    is_im: z.boolean().describe('Whether this is a direct message'),
    is_mpim: z.boolean().describe('Whether this is a multi-person direct message'),
    is_private: z.boolean().describe('Whether the conversation is private'),
    is_archived: z.boolean().describe('Whether the channel is archived'),
    is_general: z.union([z.boolean(), z.null()]).describe('Whether this is the general channel'),
    created: z.number().describe('Unix timestamp when the channel was created'),
    creator: z.union([z.string(), z.null()]).describe('User ID of the channel creator'),
    num_members: z.union([z.number(), z.null()]).describe('Number of members in the channel (if available)'),
    context_team_id: z.union([z.string(), z.null()]).describe('Team ID for the conversation')
});

const action = createAction({
    description: 'Retrieve conversation details including topic, purpose, and membership state',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/get-channel-info',
        group: 'Channels'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['channels:read', 'groups:read', 'im:read', 'mpim:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://api.slack.com/methods/conversations.info
            endpoint: 'conversations.info',
            params: {
                channel: input.channel_id,
                include_num_members: 'true'
            },
            retries: 3
        });

        if (!response.data || response.data.ok === false) {
            throw new nango.ActionError({
                type: 'api_error',
                message: response.data?.error || 'Failed to retrieve channel information',
                channel_id: input.channel_id
            });
        }

        const channel = response.data.channel;

        return {
            id: channel.id,
            name: channel.name ?? null,
            topic: channel.topic ?? null,
            purpose: channel.purpose ?? null,
            is_channel: channel.is_channel ?? false,
            is_group: channel.is_group ?? false,
            is_im: channel.is_im ?? false,
            is_mpim: channel.is_mpim ?? false,
            is_private: channel.is_private ?? false,
            is_archived: channel.is_archived ?? false,
            is_general: channel.is_general ?? null,
            created: channel.created ?? 0,
            creator: channel.creator ?? null,
            num_members: channel.num_members ?? null,
            context_team_id: channel.context_team_id ?? null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
