/**
 * Instructions: Opens a direct message or multi-person direct message.
 * API: https://api.slack.com/methods/conversations.open
 */

import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const OpenDmInput = z.object({
    users: z.string().describe('Comma-separated list of user IDs. Example: "U02MDCKS1N0,U01ABC123"'),
    return_im: z.boolean().optional().describe('Return the full IM channel object. Default: false')
});

const OpenDmOutput = z.object({
    ok: z.boolean().describe('Whether the request was successful'),
    channel: z
        .object({
            id: z.string().describe('The DM channel ID')
        })
        .describe('The opened DM channel')
});

const action = createAction({
    description: 'Opens a direct message or multi-person direct message.',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/conversations/dm/open',
        group: 'Conversations'
    },

    input: OpenDmInput,
    output: OpenDmOutput,
    scopes: ['im:write', 'mpim:write'],

    exec: async (nango, input): Promise<z.infer<typeof OpenDmOutput>> => {
        const config: ProxyConfiguration = {
            // https://api.slack.com/methods/conversations.open
            endpoint: 'conversations.open',
            data: {
                users: input.users,
                ...(input.return_im !== undefined && { return_im: input.return_im })
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
