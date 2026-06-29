import { z } from 'zod';
import { createAction } from 'nango';

const ChannelMemberProviderSchema = z.object({
    user_id: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    name: z.string().nullable().optional()
});

const ChannelProviderSchema = z.object({
    id: z.string(),
    title: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
    created_by: z.string().nullable().optional(),
    is_private: z.boolean().nullable().optional(),
    members: z.array(ChannelMemberProviderSchema).nullable().optional()
});

const ChannelMemberSchema = z.object({
    user_id: z.string().describe('User ID. Example: "user-id-1"'),
    email: z.string().describe('Email address. Example: "john@example.com"'),
    name: z.string().describe('User name. Example: "John Doe"')
});

const ChannelSchema = z.object({
    id: z.string().describe('Channel ID. Example: "channel-id-1"'),
    title: z.string().describe('Channel title. Example: "Engineering"'),
    created_at: z.string().describe('Creation timestamp. Example: "2024-01-01T00:00:00Z"'),
    updated_at: z.string().describe('Last update timestamp. Example: "2024-01-01T00:00:00Z"'),
    created_by: z.string().describe('User ID of the creator. Example: "user-id-1"'),
    is_private: z.boolean().describe('Whether the channel is private'),
    members: z.array(ChannelMemberSchema)
});

const OutputSchema = z.object({
    channels: z.array(ChannelSchema)
});

const GraphQLResponseSchema = z.object({
    data: z
        .object({
            channels: z.array(ChannelProviderSchema)
        })
        .nullable()
        .optional(),
    errors: z.array(z.object({ message: z.string() })).optional()
});

const action = createAction({
    description: 'List all channels in the workspace.',
    version: '1.0.0',
    input: z.object({}),
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.fireflies.ai/graphql-api/query/channels
            endpoint: '/graphql',
            data: {
                query: `query Channels {
                    channels {
                        id
                        title
                        created_at
                        updated_at
                        created_by
                        is_private
                        members {
                            user_id
                            email
                            name
                        }
                    }
                }`
            },
            retries: 3
        });

        const parsed = GraphQLResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Fireflies API'
            });
        }

        if (parsed.data.errors && parsed.data.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: parsed.data.errors[0]!.message
            });
        }

        const channelsData = parsed.data.data?.channels;
        if (!channelsData) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected channels array in response'
            });
        }

        const channels = channelsData.map((channel) => {
            if (channel.title == null || channel.created_at == null || channel.updated_at == null || channel.created_by == null || channel.is_private == null) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: `Channel ${channel.id} is missing required fields`
                });
            }

            const members = (channel.members ?? []).map((member) => {
                if (member.user_id == null || member.email == null || member.name == null) {
                    throw new nango.ActionError({
                        type: 'invalid_response',
                        message: `Channel ${channel.id} has a member missing required fields`
                    });
                }
                return { user_id: member.user_id, email: member.email, name: member.name };
            });

            return {
                id: channel.id,
                title: channel.title,
                created_at: channel.created_at,
                updated_at: channel.updated_at,
                created_by: channel.created_by,
                is_private: channel.is_private,
                members
            };
        });

        return { channels };
    }
});

export default action;
