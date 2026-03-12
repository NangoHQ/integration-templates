import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    channel_id: z.string().describe('Channel ID where the message was posted. Example: "C1234567890"'),
    timestamp: z.string().describe('Timestamp of the message to get reactions for. Example: "1648602352.215969"'),
    full: z.boolean().optional().describe('If true, always return the complete reaction list.')
});

const ReactionSchema = z.object({
    name: z.string().describe('Name of the emoji reaction. Example: "grinning"'),
    count: z.number().describe('Number of users who reacted with this emoji'),
    users: z.array(z.string()).describe('List of user IDs who reacted with this emoji')
});

const OutputSchema = z.object({
    type: z.string().describe('Type of the item (message, file, etc.). Example: "message"'),
    channel: z.string().describe('Channel ID where the message was posted'),
    message: z.object({
        type: z.string(),
        text: z.string().optional(),
        user: z.string(),
        ts: z.string(),
        team: z.string().optional(),
        reactions: z.array(ReactionSchema).optional()
    }),
    permalink: z.string().optional().describe('Permanent link to the message')
});

const action = createAction({
    description: 'Retrieve all reactions attached to a specific message',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/get-reactions',
        group: 'Reactions'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['reactions:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://api.slack.com/methods/reactions.get
        const response = await nango.get({
            endpoint: 'reactions.get',
            params: {
                channel: input.channel_id,
                timestamp: input.timestamp,
                ...(input.full !== undefined && { full: input.full.toString() })
            },
            retries: 3
        });

        if (!response.data.ok) {
            throw new nango.ActionError({
                type: 'slack_api_error',
                message: response.data.error || 'Failed to get reactions',
                error: response.data.error
            });
        }

        const message = response.data.message || {};

        return {
            type: response.data.type || 'message',
            channel: input.channel_id,
            message: {
                type: message.type || 'message',
                text: message.text,
                user: message.user,
                ts: message.ts,
                team: message.team,
                reactions:
                    message.reactions?.map((reaction: { name: string; count: number; users: string[] }) => ({
                        name: reaction.name,
                        count: reaction.count,
                        users: reaction.users
                    })) || []
            },
            permalink: response.data.permalink
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
