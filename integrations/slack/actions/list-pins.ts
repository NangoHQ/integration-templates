/**
 * Instructions: Lists all items pinned to a channel
 * API: https://api.slack.com/methods/pins.list
 */
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const Input = z.object({
    channel_id: z.string()
        .describe('The channel to list pinned items for. Example: "C02MB5ZABA7"')
});

const Output = z.object({
    ok: z.boolean()
        .describe('Whether the request was successful'),
    items: z.array(z.any())
        .describe('Array of pinned items (messages, files)')
});

const action = createAction({
    description: 'Lists all items pinned to a channel.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/list-pins',
        group: 'Actions'
    },
    input: Input,
    output: Output,
    scopes: ['pins:read'],
    exec: async (nango, input): Promise<z.infer<typeof Output>> => {
        const config: ProxyConfiguration = {
            endpoint: 'pins.list',
            params: {
                channel: input.channel_id
            },
            retries: 3
        };
        const response = await nango.get(config);
        return {
            ok: response.data.ok,
            items: response.data.items
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
