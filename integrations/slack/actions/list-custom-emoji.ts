/**
 * Instructions: Lists all custom emoji for the workspace
 * API: https://api.slack.com/methods/emoji.list
 */
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const Input = z.object({});

const Output = z.object({
    ok: z.boolean()
        .describe('Whether the request was successful'),
    emoji: z.any()
        .describe('Object mapping emoji names to URLs or aliases')
});

const action = createAction({
    description: 'Lists all custom emoji for the workspace.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/list-custom-emoji',
        group: 'Actions'
    },
    input: Input,
    output: Output,
    scopes: ['emoji:read'],
    exec: async (nango, _input): Promise<z.infer<typeof Output>> => {
        const config: ProxyConfiguration = {
            endpoint: 'emoji.list',
            retries: 3
        };
        const response = await nango.get(config);
        return {
            ok: response.data.ok,
            emoji: response.data.emoji
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
