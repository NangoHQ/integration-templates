/**
 * Instructions: Updates a channels topic.
 * API: https://api.slack.com/methods/conversations.setTopic
 */

import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const SetChannelTopicInput = z.object({
    channel_id: z.string().describe('The channel to update. Example: "C02MB5ZABA7"'),
    topic: z.string().describe('The new topic text. Example: "Q4 Planning Discussion"')
});

const SetChannelTopicOutput = z.object({
    ok: z.boolean().describe('Whether the request was successful'),
    topic: z.string().describe('The updated topic text')
});

const action = createAction({
    description: "Updates a channel's topic.",
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/channels/topic',
        group: 'Channels'
    },

    input: SetChannelTopicInput,
    output: SetChannelTopicOutput,
    scopes: ['channels:write'],

    exec: async (nango, input): Promise<z.infer<typeof SetChannelTopicOutput>> => {
        const config: ProxyConfiguration = {
            // https://api.slack.com/methods/conversations.setTopic
            endpoint: 'conversations.setTopic',
            data: {
                channel: input.channel_id,
                topic: input.topic
            },
            retries: 3
        };

        const response = await nango.post(config);

        return {
            ok: response.data.ok,
            topic: response.data.topic
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
