/**
 * Instructions: Joins a public or private channel.
 * API: https://api.slack.com/methods/conversations.join
 */

import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const JoinChannelInput = z.object({
    channel_id: z.string().describe('The channel to join. Example: "C02MB5ZABA7"')
});

const JoinChannelOutput = z.object({
    ok: z.boolean().describe('Whether the request was successful'),
    channel: z.object({
        id: z.string(),
        name: z.string(),
        is_channel: z.boolean(),
        is_group: z.boolean(),
        is_im: z.boolean(),
        is_mpim: z.boolean(),
        is_private: z.boolean(),
        created: z.number(),
        is_archived: z.boolean(),
        is_general: z.boolean(),
        unlinked: z.number(),
        name_normalized: z.string(),
        is_shared: z.boolean(),
        is_org_shared: z.boolean(),
        is_pending_ext_shared: z.boolean(),
        pending_shared: z.array(z.string()),
        context_team_id: z.string(),
        updated: z.number(),
        parent_conversation: z.string().nullable(),
        creator: z.string(),
        is_ext_shared: z.boolean(),
        shared_team_ids: z.array(z.string()),
        pending_connected_team_ids: z.array(z.string()),
        is_member: z.boolean(),
        topic: z.object({
            value: z.string(),
            creator: z.string(),
            last_set: z.number()
        }),
        purpose: z.object({
            value: z.string(),
            creator: z.string(),
            last_set: z.number()
        }),
        previous_names: z.array(z.string())
    })
});

const action = createAction({
    description: 'Joins a public or private channel.',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/channels/join',
        group: 'Channels'
    },

    input: JoinChannelInput,
    output: JoinChannelOutput,
    scopes: ['channels:write'],

    exec: async (nango, input): Promise<z.infer<typeof JoinChannelOutput>> => {
        const config: ProxyConfiguration = {
            // https://api.slack.com/methods/conversations.join
            endpoint: 'conversations.join',
            data: {
                channel: input.channel_id
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
