/**
 * Instructions: Updates a channels description or purpose.
 * API: https://api.slack.com/methods/conversations.setPurpose
 */

import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const SetChannelPurposeInput = z.object({
    channel_id: z.string()
        .describe('The channel to update. Example: "C02MB5ZABA7"'),
    purpose: z.string()
        .describe('The new purpose text. Example: "Discussion about project updates"')
});

const SetChannelPurposeOutput = z.object({
    ok: z.boolean()
        .describe('Whether the request was successful'),
    purpose: z.string()
        .describe('The updated purpose text')
});

const action = createAction({
    description: "Updates a channel's description or purpose.",
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/channels/purpose',
        group: 'Channels'
    },

    input: SetChannelPurposeInput,
    output: SetChannelPurposeOutput,
    scopes: ['channels:write'],

    exec: async (nango, input): Promise<z.infer<typeof SetChannelPurposeOutput>> => {
        const config: ProxyConfiguration = {
            // https://api.slack.com/methods/conversations.setPurpose
            endpoint: 'conversations.setPurpose',
            data: {
                channel: input.channel_id,
                purpose: input.purpose
            },
            retries: 3
        };

        const response = await nango.post(config);

        return {
            ok: response.data.ok,
            purpose: response.data.purpose
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
