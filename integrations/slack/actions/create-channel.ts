/**
 * Instructions: Creates a new public or private channel.
 * API: https://api.slack.com/methods/conversations.create
 */

import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

// Inline schema definitions
const CreateChannelInput = z.object({
    name: z.string()
        .describe('Channel name (lowercase, no spaces, max 80 chars). Example: "test-channel-nango"'),
    is_private: z.boolean().optional()
        .describe('Whether channel should be private. Default: false')
});

const CreateChannelOutput = z.object({
    ok: z.boolean()
        .describe('Whether the channel was created successfully'),
    channel: z.any()
        .describe('The created channel object')
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
