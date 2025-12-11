/**
 * Instructions: Retrieves information about a specific user
 * API: https://api.slack.com/methods/users.info
 */

import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

// Inline schema definitions
const GetUserInfoInput = z.object({
    user_id: z.string().describe('The user ID to get info for. Example: "U02MDCKS1N0"')
});

const GetUserInfoOutput = z.object({
    ok: z.boolean().describe('Whether the request was successful'),
    user: z.any().describe('The user object with profile details like name, email, avatar')
});

const action = createAction({
    description: 'Retrieves information about a specific user.',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/users/info',
        group: 'Users'
    },

    input: GetUserInfoInput,
    output: GetUserInfoOutput,
    scopes: ['users:read'],

    exec: async (nango, input): Promise<z.infer<typeof GetUserInfoOutput>> => {
        const config: ProxyConfiguration = {
            // https://api.slack.com/methods/users.info
            endpoint: 'users.info',
            params: {
                user: input.user_id
            },
            retries: 3
        };

        const response = await nango.get(config);

        return {
            ok: response.data.ok,
            user: response.data.user
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
