/**
 * Instructions: Gets a users current presence status and activity
 * API: https://api.slack.com/methods/users.getPresence
 */

import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

// Inline schema definitions
const GetUserPresenceInput = z.object({
    user_id: z.string()
        .describe('The user ID to get presence for. Example: "U02MDCKS1N0"')
});

const GetUserPresenceOutput = z.object({
    ok: z.boolean()
        .describe('Whether the request was successful'),
    presence: z.string()
        .describe('The user presence status: "active" or "away"')
});

const action = createAction({
    description: "Gets a user's current presence status and activity.",
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/users/presence',
        group: 'Users'
    },

    input: GetUserPresenceInput,
    output: GetUserPresenceOutput,
    scopes: ['users:read'],

    exec: async (nango, input): Promise<z.infer<typeof GetUserPresenceOutput>> => {
        const config: ProxyConfiguration = {
            // https://api.slack.com/methods/users.getPresence
            endpoint: 'users.getPresence',
            params: {
                user: input.user_id
            },
            retries: 3
        };

        const response = await nango.get(config);

        return {
            ok: response.data.ok,
            presence: response.data.presence
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
