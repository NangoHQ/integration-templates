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

const GetChannelInfoOutput = z.object({
    ok: z.boolean().describe('Whether the request was successful'),
    channel: z.any().describe('The channel object with details like name, topic, purpose, members count')
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
