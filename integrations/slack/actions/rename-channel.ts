/**
 * Instructions: Renames a conversation with proper permissions.
 * API: https://api.slack.com/methods/conversations.rename
 */

import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const RenameChannelInput = z.object({
    channel_id: z.string()
        .describe('The channel to rename. Example: "C02MB5ZABA7"'),
    channel_name: z.string()
        .describe('The new name for the channel. Example: "new-channel-name"')
});

const RenameChannelOutput = z.object({
    ok: z.boolean()
        .describe('Whether the request was successful'),
    channel: z.any()
        .describe('The updated channel object')
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
