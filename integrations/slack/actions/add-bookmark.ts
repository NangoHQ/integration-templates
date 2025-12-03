/**
 * Instructions: Adds a bookmark link to a channel
 * API: https://api.slack.com/methods/bookmarks.add
 */
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const Input = z.object({
    channel_id: z.string()
        .describe('The channel to add the bookmark to. Example: "C02MB5ZABA7"'),
    title: z.string()
        .describe('Display title for the bookmark. Example: "Nango Docs"'),
    type: z.string()
        .describe('Bookmark type. Example: "link"'),
    link: z.string()
        .describe('URL for the bookmark. Example: "https://docs.nango.dev"')
});

const Output = z.object({
    ok: z.boolean()
        .describe('Whether the bookmark was added successfully'),
    bookmark: z.any()
        .describe('The created bookmark object')
});

const action = createAction({
    description: 'Adds a bookmark link to a channel.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/add-bookmark',
        group: 'Actions'
    },
    input: Input,
    output: Output,
    scopes: ['bookmarks:write'],
    exec: async (nango, input): Promise<z.infer<typeof Output>> => {
        const config: ProxyConfiguration = {
            // https://api.slack.com/methods/bookmarks.add
            endpoint: 'bookmarks.add',
            data: {
                channel_id: input.channel_id,
                title: input.title,
                type: input.type,
                link: input.link
            },
            retries: 3
        };
        const response = await nango.post(config);
        return {
            ok: response.data.ok,
            bookmark: response.data.bookmark
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
