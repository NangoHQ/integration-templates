/**
 * Instructions: Restores an archived conversation.
 * API: https://api.slack.com/methods/conversations.unarchive
 */

import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

// Inline schema definitions
const UnarchiveChannelInput = z.object({
    channel_id: z.string().describe('The channel to unarchive. Example: "C02MB5ZABA7"')
});

const UnarchiveChannelOutput = z.object({
    ok: z.boolean().describe('Whether the request was successful')
});

const action = createAction({
    description: 'Restores an archived conversation.',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/channels/unarchive',
        group: 'Channels'
    },

    input: UnarchiveChannelInput,
    output: UnarchiveChannelOutput,
    scopes: ['channels:manage'],

    exec: async (nango, input): Promise<z.infer<typeof UnarchiveChannelOutput>> => {
        const config: ProxyConfiguration = {
            // https://api.slack.com/methods/conversations.unarchive
            endpoint: 'conversations.unarchive',
            data: {
                channel: input.channel_id
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
