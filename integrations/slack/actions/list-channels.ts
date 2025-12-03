/**
 * Instructions: Lists all channel-like conversations in a workspace.
 * API: https://api.slack.com/methods/conversations.list
 */

import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

// Inline schema definitions
const ListChannelsInput = z.object({
    types: z.string().optional()
        .describe('Comma-separated list of channel types. Example: "public_channel,private_channel"'),
    limit: z.number().optional()
        .describe('Maximum number of channels to return. Default: 100'),
    cursor: z.string().optional()
        .describe('Pagination cursor from previous response')
});

const ListChannelsOutput = z.object({
    ok: z.boolean()
        .describe('Whether the request was successful'),
    channels: z.array(z.any())
        .describe('Array of channel objects'),
    next_cursor: z.union([z.string(), z.null()])
        .describe('Cursor for next page, null if no more pages')
});

const action = createAction({
    description: 'Lists all channel-like conversations in a workspace.',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/channels/list',
        group: 'Channels'
    },

    input: ListChannelsInput,
    output: ListChannelsOutput,
    scopes: ['channels:read'],

    exec: async (nango, input): Promise<z.infer<typeof ListChannelsOutput>> => {
        const config: ProxyConfiguration = {
            // https://api.slack.com/methods/conversations.list
            endpoint: 'conversations.list',
            params: {
                ...(input.types && { types: input.types }),
                ...(input.limit && { limit: input.limit.toString() }),
                ...(input.cursor && { cursor: input.cursor })
            },
            retries: 3
        };

        const response = await nango.get(config);

        return {
            ok: response.data.ok,
            channels: response.data.channels,
            next_cursor: response.data.response_metadata?.next_cursor || null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
