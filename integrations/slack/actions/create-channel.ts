/**
 * Instructions: Creates a new public or private channel.
 * API: https://api.slack.com/methods/conversations.create
 */

import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

// Inline schema definitions
const CreateChannelInput = z.object({
    name: z.string().describe('Channel name (lowercase, no spaces, max 80 chars). Example: "test-channel-nango"'),
    is_private: z.boolean().optional().describe('Whether channel should be private. Default: false')
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

const CreateChannelOutput = z.object({
    ok: z.boolean().describe('Whether the channel was created successfully'),
    channel: SlackChannelSchema.describe('The created channel object')
});

const action = createAction({
    description: 'Creates a new public or private channel.',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/channels',
        group: 'Channels'
    },

    input: CreateChannelInput,
    output: CreateChannelOutput,
    scopes: ['channels:manage'],

    exec: async (nango, input): Promise<z.infer<typeof CreateChannelOutput>> => {
        const config: ProxyConfiguration = {
            // https://api.slack.com/methods/conversations.create
            endpoint: 'conversations.create',
            data: {
                name: input.name,
                ...(input.is_private !== undefined && { is_private: input.is_private })
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
