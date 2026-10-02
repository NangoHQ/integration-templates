import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({})
    .describe('No input required. The action returns the profile of the Jotform account that owns the API key used by the connection.');

const JotformUserSchema = z.object({
    username: z.string(),
    name: z.string().nullish(),
    email: z.string(),
    website: z.string().nullish(),
    time_zone: z.string().nullish(),
    account_type: z.string(),
    status: z.string(),
    created_at: z.string().nullish(),
    updated_at: z.string().nullish(),
    region: z.string().nullish(),
    is_verified: z.string().nullish(),
    usage: z.string().nullish(),
    avatarUrl: z.string().nullish(),
    language: z.string().nullish(),
    isHIPAA: z.string().nullish(),
    euOnly: z.string().nullish(),
    is2FAEnabled: z.boolean().nullish()
});

const JotformUserResponseSchema = z.object({
    content: JotformUserSchema
});

const OutputSchema = z
    .object({
        username: z.string().describe('Jotform account username. Example: "jane_doe"'),
        name: z.string().optional().describe("Account holder's display name. Omitted when the account has no name set (Jotform returns null)."),
        email: z.string().describe('Email address registered on the account. Example: "jane@example.com"'),
        website: z.string().optional().describe('Website URL set on the account. Omitted when not set (Jotform returns null).'),
        time_zone: z.string().optional().describe('Account time zone. Example: "America/New_York"'),
        account_type: z
            .string()
            .describe('Subscription plan identifier, returned as a URL rather than a plain enum. Example: "https://api.jotform.com/system/plan/FREE"'),
        status: z.string().describe('Account status. Example: "ACTIVE"'),
        created_at: z.string().optional().describe('Account creation timestamp in "YYYY-MM-DD HH:mm:ss" format. Example: "2024-01-15 09:30:00"'),
        updated_at: z.string().optional().describe('Timestamp of the last account update in "YYYY-MM-DD HH:mm:ss" format. Example: "2024-01-16 10:45:00"'),
        region: z.string().optional().describe('Account data region. Example: "US"'),
        is_verified: z.string().optional().describe('Whether the account email is verified, returned as a "1"/"0" string flag rather than a boolean.'),
        usage: z.string().optional().describe('API URL of the account usage endpoint. Example: "https://api.jotform.com/user/usage"'),
        avatarUrl: z.string().optional().describe("URL of the account's avatar image. Omitted when no avatar is set."),
        language: z.string().optional().describe('Account locale. Example: "en-US"'),
        isHIPAA: z.string().optional().describe('Whether the account is HIPAA-enabled, returned as a "1"/"0" string flag rather than a boolean.'),
        euOnly: z.string().optional().describe('Whether the account is restricted to EU servers, returned as a "1"/"0" string flag rather than a boolean.'),
        is2FAEnabled: z.boolean().optional().describe('Whether two-factor authentication is enabled on the account.')
    })
    .describe("Profile of the authenticated Jotform account (the owner of the connection's API key).");

/**
 * @tags: [read]
 * @tagReason: Performs a single read-only GET of the connected Jotform account's profile.
 * @pitfalls: account_type is a URL-shaped plan identifier (e.g. "https://api.jotform.com/system/plan/FREE") rather than a plain enum. Flag fields are inconsistently typed: is_verified, isHIPAA and euOnly arrive as "1"/"0" strings (compare against "1"; the string "0" is truthy), while is2FAEnabled is a real boolean.
 */
const action = createAction({
    description: "Retrieve the authenticated Jotform account's profile information.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://api.jotform.com/docs/#user
            endpoint: '/user',
            retries: 3
        };

        const response = await nango.get(config);

        const parsed = JotformUserResponseSchema.parse(response.data);
        const user = parsed.content;

        return {
            username: user.username,
            email: user.email,
            account_type: user.account_type,
            status: user.status,
            ...(user.name != null && { name: user.name }),
            ...(user.website != null && { website: user.website }),
            ...(user.time_zone != null && { time_zone: user.time_zone }),
            ...(user.created_at != null && { created_at: user.created_at }),
            ...(user.updated_at != null && { updated_at: user.updated_at }),
            ...(user.region != null && { region: user.region }),
            ...(user.is_verified != null && { is_verified: user.is_verified }),
            ...(user.usage != null && { usage: user.usage }),
            ...(user.avatarUrl != null && { avatarUrl: user.avatarUrl }),
            ...(user.language != null && { language: user.language }),
            ...(user.isHIPAA != null && { isHIPAA: user.isHIPAA }),
            ...(user.euOnly != null && { euOnly: user.euOnly }),
            ...(user.is2FAEnabled != null && { is2FAEnabled: user.is2FAEnabled })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
