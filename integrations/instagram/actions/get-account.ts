import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        ig_user_id: z
            .string()
            .min(1)
            .optional()
            .describe('Instagram professional account ID to retrieve. Omit to use the authenticated account. Example: "17841400000000000"')
    })
    .describe('Optional account selector for the Instagram account lookup.');

const ProviderUserSchema = z.object({
    id: z.string(),
    user_id: z.string().nullable().optional(),
    username: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    biography: z.string().nullable().optional(),
    website: z.string().nullable().optional(),
    profile_picture_url: z.string().nullable().optional(),
    followers_count: z.number().nullable().optional(),
    follows_count: z.number().nullable().optional(),
    media_count: z.number().nullable().optional(),
    account_type: z.string().nullable().optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('App-scoped Instagram user ID. Example: "27136802592672293"'),
        user_id: z.string().optional().describe('Instagram professional account ID used by webhooks and other Instagram Platform APIs. Example: "17841446782016736"'),
        username: z.string().optional().describe('Instagram username. Example: "nangodev"'),
        name: z.string().optional().describe('Display name shown on the Instagram profile.'),
        biography: z.string().optional().describe('Profile bio text. Omitted when the account has no bio.'),
        website: z.string().optional().describe('Website URL listed in the profile. Omitted when the account has no website.'),
        profile_picture_url: z.string().optional().describe('URL of the account profile picture. Omitted when the account has no profile picture.'),
        followers_count: z.number().optional().describe('Number of accounts following this Instagram account.'),
        follows_count: z.number().optional().describe('Number of Instagram accounts this account follows.'),
        media_count: z.number().optional().describe('Number of media objects published by this Instagram account.'),
        account_type: z.string().optional().describe('Instagram professional account type, such as "BUSINESS" or "MEDIA_CREATOR".')
    })
    .describe('Instagram business or creator account details.');

/**
 * @tags: [read]
 * @tagReason: Retrieves the connected Instagram account's profile, business, and media summary fields without modifying any data.
 */
const action = createAction({
    description: 'Retrieve Instagram business or creator account details.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['instagram_business_basic'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const userId = input.ig_user_id ?? 'me';

        // https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user
        const response = await nango.get({
            endpoint: `/${encodeURIComponent(userId)}`,
            params: {
                fields: 'id,user_id,username,name,biography,website,profile_picture_url,followers_count,follows_count,media_count,account_type'
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Instagram account not found'
            });
        }

        const providerUser = ProviderUserSchema.parse(response.data);

        return {
            id: providerUser.id,
            ...(providerUser.user_id != null && { user_id: providerUser.user_id }),
            ...(providerUser.username != null && { username: providerUser.username }),
            ...(providerUser.name != null && { name: providerUser.name }),
            ...(providerUser.biography != null && { biography: providerUser.biography }),
            ...(providerUser.website != null && { website: providerUser.website }),
            ...(providerUser.profile_picture_url != null && { profile_picture_url: providerUser.profile_picture_url }),
            ...(providerUser.followers_count != null && { followers_count: providerUser.followers_count }),
            ...(providerUser.follows_count != null && { follows_count: providerUser.follows_count }),
            ...(providerUser.media_count != null && { media_count: providerUser.media_count }),
            ...(providerUser.account_type != null && { account_type: providerUser.account_type })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
