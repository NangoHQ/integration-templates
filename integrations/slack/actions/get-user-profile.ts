/**
 * Instructions: Retrieves detailed user profile including custom fields
 * API: https://api.slack.com/methods/users.profile.get
 */

import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

// Inline schema definitions
const GetUserProfileInput = z.object({
    user_id: z.string().optional()
        .describe('User ID to get profile for. Defaults to current user. Example: "U02MDCKS1N0"')
});

const GetUserProfileOutput = z.object({
    ok: z.boolean()
        .describe('Whether the request was successful'),
    profile: z.any()
        .describe('The user profile object with fields like display_name, status_text, email')
});

const action = createAction({
    description: 'Retrieves detailed user profile including custom fields.',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/users/profile',
        group: 'Users'
    },

    input: GetUserProfileInput,
    output: GetUserProfileOutput,
    scopes: ['users:read'],

    exec: async (nango, input): Promise<z.infer<typeof GetUserProfileOutput>> => {
        const config: ProxyConfiguration = {
            // https://api.slack.com/methods/users.profile.get
            endpoint: 'users.profile.get',
            params: {
                ...(input.user_id && { user: input.user_id })
            },
            retries: 3
        };

        const response = await nango.get(config);

        return {
            ok: response.data.ok,
            profile: response.data.profile
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
