import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    user_id: z.string().describe('The ID of the user to retrieve. Example: "d42542a8-a81c-4386-aa95-313aa4e818b3"')
});

const OutputSchema = z.object({
    id: z.string(),
    object: z.string(),
    type: z.string(),
    name: z.string(),
    avatar_url: z.union([z.string(), z.null()])
});

const action = createAction({
    description: 'Gets a single user by their ID.',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/users/get',
        group: 'Users'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.notion.com/reference/get-user
            endpoint: `v1/users/${input.user_id}`,
            retries: 3
        };

        const response = await nango.get(config);
        const data = response.data;

        return {
            id: data.id,
            object: data.object,
            type: data.type,
            name: data.name,
            avatar_url: data.avatar_url ?? null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
