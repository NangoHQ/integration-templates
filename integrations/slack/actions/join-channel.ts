import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    channel_id: z.string().describe('ID of the channel to join. Example: C061EG9SL')
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    is_channel: z.boolean().optional(),
    is_group: z.boolean().optional(),
    is_im: z.boolean().optional(),
    is_private: z.boolean().optional(),
    is_archived: z.boolean().optional(),
    is_general: z.boolean().optional(),
    created: z.number().optional(),
    creator: z.string().optional(),
    is_member: z.boolean().optional(),
    num_members: z.number().optional(),
    topic: z
        .object({
            value: z.string(),
            creator: z.string(),
            last_set: z.number()
        })
        .optional(),
    purpose: z
        .object({
            value: z.string(),
            creator: z.string(),
            last_set: z.number()
        })
        .optional()
});

const action = createAction({
    description: 'Join a public or private channel and return its conversation details',
    version: '2.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/join-channel',
        group: 'Conversations'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['channels:join', 'groups:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.slack.dev/reference/methods/conversations.join
        const response = await nango.post({
            endpoint: 'conversations.join',
            data: {
                channel: input.channel_id
            },
            retries: 3
        });

        if (!response.data || !response.data.ok) {
            throw new nango.ActionError({
                type: 'api_error',
                message: response.data?.error || 'Failed to join channel',
                channel_id: input.channel_id
            });
        }

        const channel = response.data.channel;

        return {
            id: channel.id,
            name: channel.name ?? undefined,
            is_channel: channel.is_channel,
            is_group: channel.is_group,
            is_im: channel.is_im,
            is_private: channel.is_private,
            is_archived: channel.is_archived,
            is_general: channel.is_general,
            created: channel.created ?? undefined,
            creator: channel.creator ?? undefined,
            is_member: channel.is_member,
            num_members: channel.num_members ?? undefined,
            topic: channel.topic
                ? {
                      value: channel.topic.value ?? '',
                      creator: channel.topic.creator ?? '',
                      last_set: channel.topic.last_set ?? 0
                  }
                : undefined,
            purpose: channel.purpose
                ? {
                      value: channel.purpose.value ?? '',
                      creator: channel.purpose.creator ?? '',
                      last_set: channel.purpose.last_set ?? 0
                  }
                : undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
