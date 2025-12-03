/**
 * Instructions: Lists all users in a workspace including active and deactivated
 * API: https://api.slack.com/methods/users.list
 */

import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

// Inline schema definitions
const ListUsersInput = z.object({
    limit: z.number().optional()
        .describe('Maximum number of users to return. Default: 100'),
    cursor: z.string().optional()
        .describe('Pagination cursor from previous response')
});

const ListUsersOutput = z.object({
    ok: z.boolean()
        .describe('Whether the request was successful'),
    members: z.array(z.any())
        .describe('Array of user objects'),
    response_metadata: z.any()
        .describe('Pagination metadata including next_cursor')
});

const action = createAction({
    description: 'Lists all users in a workspace including active and deactivated.',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/users/list',
        group: 'Users'
    },

    input: ListUsersInput,
    output: ListUsersOutput,
    scopes: ['users:read'],

    exec: async (nango, input): Promise<z.infer<typeof ListUsersOutput>> => {
        const config: ProxyConfiguration = {
            // https://api.slack.com/methods/users.list
            endpoint: 'users.list',
            params: {
                ...(input.limit && { limit: input.limit.toString() }),
                ...(input.cursor && { cursor: input.cursor })
            },
            retries: 3
        };

        const response = await nango.get(config);

        return {
            ok: response.data.ok,
            members: response.data.members,
            response_metadata: response.data.response_metadata
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
