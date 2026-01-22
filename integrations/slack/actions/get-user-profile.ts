/**
 * Instructions: Retrieves detailed user profile including custom fields
 * API: https://api.slack.com/methods/users.profile.get
 */

import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

// Inline schema definitions
const GetUserProfileInput = z.object({
    user_id: z.string().optional().describe('User ID to get profile for. Defaults to current user. Example: "U02MDCKS1N0"')
});

const SlackUserProfileSchema = z.object({
    title: z.string().optional(),
    phone: z.string().optional(),
    skype: z.string().optional(),
    real_name: z.string().optional(),
    real_name_normalized: z.string().optional(),
    display_name: z.string().optional(),
    display_name_normalized: z.string().optional(),
    status_text: z.string().optional(),
    status_emoji: z.string().optional(),
    status_expiration: z.number().optional(),
    status_text_canonical: z.string().optional(),
    avatar_hash: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().optional(),
    image_original: z.string().optional(),
    image_24: z.string().optional(),
    image_32: z.string().optional(),
    image_48: z.string().optional(),
    image_72: z.string().optional(),
    image_192: z.string().optional(),
    image_512: z.string().optional(),
    image_1024: z.string().optional(),
    is_custom_image: z.boolean().optional(),
    huddle_state: z.string().optional(),
    huddle_state_expiration_ts: z.number().optional()
});

const GetUserProfileOutput = z.object({
    ok: z.boolean().describe('Whether the request was successful'),
    profile: SlackUserProfileSchema.describe('The user profile object with fields like display_name, status_text, email')
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
