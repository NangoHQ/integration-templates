/**
 * Instructions: Lists all bookmarks in a channel
 * API: https://api.slack.com/methods/bookmarks.list
 */
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const Input = z.object({
    channel_id: z.string()
        .describe('The channel to list bookmarks for. Example: "C02MB5ZABA7"')
});

const Output = z.object({
    ok: z.boolean()
        .describe('Whether the request was successful'),
    bookmarks: z.array(z.any())
        .describe('Array of bookmark objects with title, link, and other details')
});

const action = createAction({
    description: 'Lists all bookmarks in a channel.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/list-bookmarks',
        group: 'Actions'
    },
    input: Input,
    output: Output,
    scopes: ['bookmarks:read'],
    exec: async (nango, input): Promise<z.infer<typeof Output>> => {
        const config: ProxyConfiguration = {
            // https://api.slack.com/methods/bookmarks.list
            endpoint: 'bookmarks.list',
            params: {
                channel_id: input.channel_id
            },
            retries: 3
        };
        const response = await nango.get(config);
        return {
            ok: response.data.ok,
            bookmarks: response.data.bookmarks
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
