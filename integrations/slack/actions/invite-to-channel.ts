/**
 * Instructions: Invites 1-1000 users to a public or private channel
 * API: https://api.slack.com/methods/conversations.invite
 */

import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

// Inline schema definitions
const InviteToChannelInput = z.object({
    channel_id: z.string().describe('The channel to invite users to. Example: "C02MB5ZABA7"'),
    user_ids: z.string().describe('Comma-separated list of user IDs to invite. Example: "U02MDCKS1N0,U01ABC123"')
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

const InviteToChannelOutput = z.object({
    ok: z.boolean().describe('Whether the request was successful'),
    channel: SlackChannelSchema.describe('The updated channel object')
});

const action = createAction({
    description: 'Invites 1-1000 users to a public or private channel.',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/channels/invite',
        group: 'Channels'
    },

    input: InviteToChannelInput,
    output: InviteToChannelOutput,
    scopes: ['channels:write', 'groups:write', 'im:write', 'mpim:write'],

    exec: async (nango, input): Promise<z.infer<typeof InviteToChannelOutput>> => {
        const config: ProxyConfiguration = {
            // https://api.slack.com/methods/conversations.invite
            endpoint: 'conversations.invite',
            data: {
                channel: input.channel_id,
                users: input.user_ids
            },
            retries: 3
        };

        const response = await nango.post(config);

        return {
            ok: response.data.ok,
            channel: response.data.channel
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
