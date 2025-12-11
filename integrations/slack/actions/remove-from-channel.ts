/**
 * Instructions: Removes a user from a channel.
 * API: https://api.slack.com/methods/conversations.kick
 */

import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const RemoveFromChannelInput = z.object({
    channel_id: z.string().describe('The channel to remove the user from. Example: "C02MB5ZABA7"'),
    user_id: z.string().describe('The user ID to remove. Example: "U02MDCKS1N0"')
});

const RemoveFromChannelOutput = z.object({
    ok: z.boolean().describe('Whether the request was successful')
});

const action = createAction({
    description: 'Removes a user from a channel.',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/channels/members/remove',
        group: 'Channels'
    },

    input: RemoveFromChannelInput,
    output: RemoveFromChannelOutput,
    scopes: ['channels:write'],

    exec: async (nango, input): Promise<z.infer<typeof RemoveFromChannelOutput>> => {
        const config: ProxyConfiguration = {
            // https://api.slack.com/methods/conversations.kick
            endpoint: 'conversations.kick',
            data: {
                channel: input.channel_id,
                user: input.user_id
            },
            retries: 3
        };

        const response = await nango.post(config);

        return {
            ok: response.data.ok
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
