/**
 * Instructions: Leaves a public or private channel.
 * API: https://api.slack.com/methods/conversations.leave
 */

import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const LeaveChannelInput = z.object({
    channel_id: z.string().describe('The channel to leave. Example: "C02MB5ZABA7"')
});

const LeaveChannelOutput = z.object({
    ok: z.boolean().describe('Whether the request was successful')
});

const action = createAction({
    description: 'Leaves a public or private channel.',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/channels/leave',
        group: 'Channels'
    },

    input: LeaveChannelInput,
    output: LeaveChannelOutput,
    scopes: ['channels:write'],

    exec: async (nango, input): Promise<z.infer<typeof LeaveChannelOutput>> => {
        const config: ProxyConfiguration = {
            // https://api.slack.com/methods/conversations.leave
            endpoint: 'conversations.leave',
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
