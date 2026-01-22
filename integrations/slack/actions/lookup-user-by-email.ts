/**
 * Instructions: Finds a user by their registered email address
 * API: https://api.slack.com/methods/users.lookupByEmail
 */

import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

// Inline schema definitions
const LookupUserByEmailInput = z.object({
    email: z.string().describe('The email address to lookup. Example: "user@example.com"')
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
    avatar_hash: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().optional(),
    image_24: z.string().optional(),
    image_32: z.string().optional(),
    image_48: z.string().optional(),
    image_72: z.string().optional(),
    image_192: z.string().optional(),
    image_512: z.string().optional(),
    team: z.string().optional()
});

const SlackUserSchema = z.object({
    id: z.string(),
    team_id: z.string().optional(),
    name: z.string().optional(),
    deleted: z.boolean().optional(),
    color: z.string().optional(),
    real_name: z.string().optional(),
    tz: z.string().optional(),
    tz_label: z.string().optional(),
    tz_offset: z.number().optional(),
    profile: SlackUserProfileSchema.optional(),
    is_admin: z.boolean().optional(),
    is_owner: z.boolean().optional(),
    is_primary_owner: z.boolean().optional(),
    is_restricted: z.boolean().optional(),
    is_ultra_restricted: z.boolean().optional(),
    is_bot: z.boolean().optional(),
    is_app_user: z.boolean().optional(),
    updated: z.number().optional(),
    is_email_confirmed: z.boolean().optional(),
    who_can_share_contact_card: z.string().optional()
});

const LookupUserByEmailOutput = z.object({
    ok: z.boolean().describe('Whether the request was successful'),
    user: SlackUserSchema.describe('The user object if found')
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
