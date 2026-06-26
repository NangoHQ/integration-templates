import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    channel_id: z.string().describe('The unique identifier of the channel to fetch. Example: "channel-id-1"')
});

const ChannelMemberSchema = z.object({
    user_id: z.string().optional(),
    email: z.string().optional(),
    name: z.string().optional()
});

const ProviderChannelSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    is_private: z.boolean().optional(),
    created_by: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    members: z.array(ChannelMemberSchema).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    is_private: z.boolean().optional(),
    created_by: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    members: z.array(ChannelMemberSchema).optional()
});

const action = createAction({
    description: 'Retrieve a specific channel by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.fireflies.ai/graphql-api/query/channel
            endpoint: '/graphql',
            data: {
                query: `query Channel($channelId: ID!) {
                    channel(id: $channelId) {
                        id
                        title
                        is_private
                        created_by
                        created_at
                        updated_at
                        members {
                            user_id
                            email
                            name
                        }
                    }
                }`,
                variables: {
                    channelId: input.channel_id
                }
            },
            retries: 3
        });

        if (!response.data || !response.data.data || !response.data.data.channel) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Channel not found or you do not have access to it.',
                channel_id: input.channel_id
            });
        }

        const providerChannel = ProviderChannelSchema.parse(response.data.data.channel);

        return {
            id: providerChannel.id,
            ...(providerChannel.title !== undefined && { title: providerChannel.title }),
            ...(providerChannel.is_private !== undefined && { is_private: providerChannel.is_private }),
            ...(providerChannel.created_by !== undefined && { created_by: providerChannel.created_by }),
            ...(providerChannel.created_at !== undefined && { created_at: providerChannel.created_at }),
            ...(providerChannel.updated_at !== undefined && { updated_at: providerChannel.updated_at }),
            ...(providerChannel.members !== undefined && { members: providerChannel.members })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
