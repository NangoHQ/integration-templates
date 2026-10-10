import { createAction } from 'nango';
import { z } from 'zod';

const InputSchema = z.object({}).describe('This action takes no input parameters.');

const CitySchema = z.object({
    country_code: z.string().optional().describe('Two-letter country code. Example: "US".'),
    name: z.string().optional().describe('City name. Example: "San Francisco".'),
    state: z.string().optional().describe('State name. Example: "California".'),
    title: z.string().optional().describe('Human-readable location label that combines the city and state or country.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique WakaTime user identifier.'),
        email: z.string().optional().describe("The user's email address (only returned when the email scope is granted)."),
        display_name: z
            .string()
            .optional()
            .describe("Display name shown on the profile, derived from the full name or username; defaults to 'Anonymous User'."),
        username: z.string().nullable().optional().describe('Public WakaTime username, or null when unset.'),
        full_name: z.string().nullable().optional().describe('Full name of the user, or null when unset.'),
        timezone: z.string().optional().describe('User timezone in Olson Country/Region format. Example: "Africa/Nairobi".'),
        bio: z.string().nullable().optional().describe('User-defined bio, or null when unset.'),
        photo: z.string().nullable().optional().describe('URL of the user photo, or null when unset.'),
        website: z.string().nullable().optional().describe('Website of the user, or null when unset.'),
        human_readable_website: z.string().nullable().optional().describe('Website URL with the protocol removed, or null when unset.'),
        profile_url: z.string().nullable().optional().describe('Public WakaTime profile URL, or null when unset.'),
        city: CitySchema.nullable().optional().describe('City-level location of the user, or null when unset.'),
        github_username: z.string().nullable().optional().describe('Linked GitHub username, or null when unset.'),
        twitter_username: z.string().nullable().optional().describe('Linked Twitter handle, or null when unset.'),
        linkedin_username: z.string().nullable().optional().describe('Linked LinkedIn username, or null when unset.'),
        wonderfuldev_username: z.string().nullable().optional().describe('Linked wonderful.dev username, or null when unset.'),
        public_email: z.string().nullable().optional().describe('Email address shown on the public profile, or null when unset.'),
        last_heartbeat_at: z
            .string()
            .nullable()
            .optional()
            .describe('ISO 8601 timestamp of the most recent heartbeat, or null when the user has never sent one.'),
        last_plugin: z.string().nullable().optional().describe('User-agent string of the last plugin used, or null when unset.'),
        last_plugin_name: z.string().nullable().optional().describe('Name of the editor used last, or null when unset.'),
        last_project: z.string().nullable().optional().describe('Name of the last project coded in, or null when unset.'),
        last_branch: z.string().nullable().optional().describe('Name of the last branch coded in, or null when unset.'),
        last_language: z.string().nullable().optional().describe('Name of the last language coded in, or null when unset.'),
        is_email_confirmed: z.boolean().optional().describe("Whether the user's email address has been verified."),
        is_email_public: z.boolean().optional().describe('Whether the email is shown on the public profile.'),
        is_photo_public: z.boolean().optional().describe('Whether the photo is shown on the public profile.'),
        is_hireable: z.boolean().optional().describe('Whether the hireable badge is shown on the public profile.'),
        logged_time_public: z.boolean().optional().describe('Whether coding activity is shown on the public profile.'),
        languages_used_public: z.boolean().optional().describe('Whether languages used are shown on the public profile.'),
        editors_used_public: z.boolean().optional().describe('Whether editors used are shown on the public profile.'),
        categories_used_public: z.boolean().optional().describe('Whether categories used are shown on the public profile.'),
        os_used_public: z.boolean().optional().describe('Whether operating systems used are shown on the public profile.'),
        ai_used_public: z.boolean().optional().describe('Whether AI usage is shown on the public profile.'),
        has_premium_features: z.boolean().optional().describe('Whether the user has access to premium features.'),
        plan: z.string().nullable().optional().describe('Subscription plan of the user, or null when unset.'),
        created_at: z.string().optional().describe('ISO 8601 timestamp when the account was created.'),
        modified_at: z.string().optional().describe('ISO 8601 timestamp when the account was last modified.')
    })
    .describe("The authenticated WakaTime user's profile.");

const ProviderResponseSchema = z.object({
    data: OutputSchema
});

/**
 * @tags: [read]
 * @tagReason: Reads the authenticated user's profile; it does not modify any provider state.
 * @pitfalls: Email is only returned when the email scope is granted, and optional profile fields (username, full_name, bio, city, social handles) plus last_heartbeat_at come back as null until set or when the account has no coding activity.
 */
const action = createAction({
    description: "Get the authenticated WakaTime user's profile.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['email'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://wakatime.com/developers#users
            endpoint: '/api/v1/users/current',
            retries: 3
        });

        return ProviderResponseSchema.parse(response.data).data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
