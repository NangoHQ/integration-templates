import { z } from 'zod';
import { createAction } from 'nango';

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object';
}

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

        const rawData = response.data;
        if (!rawData || typeof rawData !== 'object' || !('data' in rawData)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Fireflies API'
            });
        }

        const channelsArray =
            rawData &&
            typeof rawData === 'object' &&
            'data' in rawData &&
            rawData['data'] &&
            typeof rawData['data'] === 'object' &&
            'channels' in rawData['data'] &&
            Array.isArray(rawData['data']['channels'])
                ? rawData['data']['channels']
                : null;

        if (!channelsArray) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected channels array in response'
            });
        }

        const channels = channelsArray.map((item: unknown) => {
            if (!isRecord(item)) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Invalid channel item in response'
                });
            }

            const channel = item;
            const members = Array.isArray(channel['members'])
                ? channel['members'].map((member: unknown) => {
                      if (!isRecord(member)) {
                          throw new nango.ActionError({
                              type: 'invalid_response',
                              message: 'Invalid member item in response'
                          });
                      }
                      const m = member;
                      return {
                          user_id: typeof m['user_id'] === 'string' ? m['user_id'] : '',
                          email: typeof m['email'] === 'string' ? m['email'] : '',
                          name: typeof m['name'] === 'string' ? m['name'] : ''
                      };
                  })
                : [];

            return {
                id: typeof channel['id'] === 'string' ? channel['id'] : '',
                title: typeof channel['title'] === 'string' ? channel['title'] : '',
                created_at: typeof channel['created_at'] === 'string' ? channel['created_at'] : '',
                updated_at: typeof channel['updated_at'] === 'string' ? channel['updated_at'] : '',
                created_by: typeof channel['created_by'] === 'string' ? channel['created_by'] : '',
                is_private: typeof channel['is_private'] === 'boolean' ? channel['is_private'] : false,
                members
            };
        });

        return {
            channels
        };
    }
});

export default action;
