/**
 * Instructions: Retrieves detailed information about a conversation.
 * API: https://api.slack.com/methods/conversations.info
 */

import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

// Inline schema definitions
const GetChannelInfoInput = z.object({
    channel_id: z.string().describe('The channel to get info for. Example: "C02MB5ZABA7"')
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

const GetChannelInfoOutput = z.object({
    ok: z.boolean().describe('Whether the request was successful'),
    channel: SlackChannelSchema.describe('The channel object with details like name, topic, purpose, members count')
});

const action = createAction({
    description: 'Retrieves detailed information about a conversation.',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/channels/info',
        group: 'Channels'
    },

    input: GetChannelInfoInput,
    output: GetChannelInfoOutput,
    scopes: ['channels:read'],

    exec: async (nango, input): Promise<z.infer<typeof GetChannelInfoOutput>> => {
        const config: ProxyConfiguration = {
            // https://api.slack.com/methods/conversations.info
            endpoint: 'conversations.info',
            params: {
                channel: input.channel_id
            },
            retries: 3
        };

        const response = await nango.get(config);

        return {
            ok: response.data.ok,
            channel: response.data.channel
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
