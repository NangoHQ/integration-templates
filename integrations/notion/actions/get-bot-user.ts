import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({});

const OutputSchema = z.object({
    id: z.string(),
    object: z.string(),
    type: z.string(),
    name: z.string(),
    bot: z.any()
});

const action = createAction({
    description: 'Retrieves the bot user associated with the current integration token.',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/users/bot',
        group: 'Users'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.notion.com/reference/get-self
            endpoint: 'v1/users/me',
            retries: 3
        };

        const response = await nango.get(config);
        const data = response.data;

        return {
            id: data.id,
            object: data.object,
            type: data.type,
            name: data.name,
            bot: data.bot
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
