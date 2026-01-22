/**
 * Instructions: Renames a conversation with proper permissions.
 * API: https://api.slack.com/methods/conversations.rename
 */

import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const RenameChannelInput = z.object({
    channel_id: z.string().describe('The channel to rename. Example: "C02MB5ZABA7"'),
    channel_name: z.string().describe('The new name for the channel. Example: "new-channel-name"')
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

const RenameChannelOutput = z.object({
    ok: z.boolean().describe('Whether the request was successful'),
    channel: SlackChannelSchema.describe('The updated channel object')
});

const action = createAction({
    description: 'Renames a conversation with proper permissions.',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/channels/rename',
        group: 'Channels'
    },

    input: RenameChannelInput,
    output: RenameChannelOutput,
    scopes: ['channels:manage'],

    exec: async (nango, input): Promise<z.infer<typeof RenameChannelOutput>> => {
        const config: ProxyConfiguration = {
            // https://api.slack.com/methods/conversations.rename
            endpoint: 'conversations.rename',
            data: {
                channel: input.channel_id,
                name: input.channel_name
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
