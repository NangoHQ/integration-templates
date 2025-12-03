/**
 * Instructions: Lists members of a conversation with pagination.
 * API: https://api.slack.com/methods/conversations.members
 */

import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const GetChannelMembersInput = z.object({
    channel_id: z.string()
        .describe('The channel to get members for. Example: "C02MB5ZABA7"'),
    limit: z.number().optional()
        .describe('Maximum number of members to return. Default: 100'),
    cursor: z.string().optional()
        .describe('Pagination cursor from previous response')
});

const GetChannelMembersOutput = z.object({
    ok: z.boolean()
        .describe('Whether the request was successful'),
    members: z.array(z.string())
        .describe('Array of user IDs in the channel'),
    response_metadata: z.object({
        next_cursor: z.string().optional()
    }).optional()
        .describe('Pagination metadata for next page')
});

const action = createAction({
    description: 'Lists members of a conversation with pagination.',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/channels/members',
        group: 'Channels'
    },

    input: GetChannelMembersInput,
    output: GetChannelMembersOutput,
    scopes: ['channels:read', 'groups:read', 'im:read', 'mpim:read'],

    exec: async (nango, input): Promise<z.infer<typeof GetChannelMembersOutput>> => {
        const config: ProxyConfiguration = {
            // https://api.slack.com/methods/conversations.members
            endpoint: 'conversations.members',
            params: {
                channel: input.channel_id,
                ...(input.limit !== undefined && { limit: input.limit.toString() }),
                ...(input.cursor !== undefined && { cursor: input.cursor })
            },
            retries: 3
        };

        const response = await nango.get(config);

        return {
            ok: response.data.ok,
            members: response.data.members,
            response_metadata: response.data.response_metadata ?? null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
