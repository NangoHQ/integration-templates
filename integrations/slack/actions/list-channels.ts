/**
 * Instructions: Lists all channel-like conversations in a workspace.
 * API: https://api.slack.com/methods/conversations.list
 */

import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

// Inline schema definitions
const ListChannelsInput = z.object({
    types: z.string().optional().describe('Comma-separated list of channel types. Example: "public_channel,private_channel"'),
    limit: z.number().optional().describe('Maximum number of channels to return. Default: 100'),
    cursor: z.string().optional().describe('Pagination cursor from previous response')
});

const SlackChannelPurposeTopicSchema = z.object({
    value: z.string(),
    creator: z.string(),
    last_set: z.number()
});

const SlackChannelSchema = z.object({
    id: z.string(),
    name: z.string(),
    name_normalized: z.string(),
    created: z.number(),
    creator: z.string(),
    is_channel: z.boolean(),
    is_group: z.boolean(),
    is_im: z.boolean(),
    is_mpim: z.boolean(),
    is_private: z.boolean(),
    is_archived: z.boolean(),
    is_general: z.boolean(),
    is_shared: z.boolean(),
    is_ext_shared: z.boolean(),
    is_org_shared: z.boolean(),
    is_pending_ext_shared: z.boolean(),
    is_member: z.boolean().optional(),
    unlinked: z.number().optional(),
    updated: z.number().optional(),
    num_members: z.number().optional(),
    context_team_id: z.string().optional(),
    parent_conversation: z.string().nullable().optional(),
    pending_shared: z.array(z.string()).optional(),
    pending_connected_team_ids: z.array(z.string()).optional(),
    shared_team_ids: z.array(z.string()).optional(),
    previous_names: z.array(z.string()).optional(),
    topic: SlackChannelPurposeTopicSchema.optional(),
    purpose: SlackChannelPurposeTopicSchema.optional()
});

const ListChannelsOutput = z.object({
    ok: z.boolean().describe('Whether the request was successful'),
    channels: z.array(SlackChannelSchema).describe('Array of channel objects'),
    next_cursor: z.union([z.string(), z.null()]).describe('Cursor for next page, null if no more pages')
});

const action = createAction({
    description: 'Lists all channel-like conversations in a workspace.',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/channels/list',
        group: 'Channels'
    },

    input: ListChannelsInput,
    output: ListChannelsOutput,
    scopes: ['channels:read'],

    exec: async (nango, input): Promise<z.infer<typeof ListChannelsOutput>> => {
        const config: ProxyConfiguration = {
            // https://api.slack.com/methods/conversations.list
            endpoint: 'conversations.list',
            params: {
                ...(input.types && { types: input.types }),
                ...(input.limit && { limit: input.limit.toString() }),
                ...(input.cursor && { cursor: input.cursor })
            },
            retries: 3
        };

        const response = await nango.get(config);

        return {
            ok: response.data.ok,
            channels: response.data.channels,
            next_cursor: response.data.response_metadata?.next_cursor || null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
