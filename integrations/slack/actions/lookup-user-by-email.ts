/**
 * Instructions: Finds a user by their registered email address
 * API: https://api.slack.com/methods/users.lookupByEmail
 */

import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

// Inline schema definitions
const LookupUserByEmailInput = z.object({
    email: z.string()
        .describe('The email address to lookup. Example: "user@example.com"')
});

const LookupUserByEmailOutput = z.object({
    ok: z.boolean()
        .describe('Whether the request was successful'),
    user: z.any()
        .describe('The user object if found')
});

const action = createAction({
    description: 'Finds a user by their registered email address.',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/users/lookup',
        group: 'Users'
    },

    input: LookupUserByEmailInput,
    output: LookupUserByEmailOutput,
    scopes: ['users:read', 'users:read.email'],

    exec: async (nango, input): Promise<z.infer<typeof LookupUserByEmailOutput>> => {
        const config: ProxyConfiguration = {
            // https://api.slack.com/methods/users.lookupByEmail
            endpoint: 'users.lookupByEmail',
            params: {
                email: input.email
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
