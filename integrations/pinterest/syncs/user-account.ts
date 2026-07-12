import { createSync } from 'nango';
import { z } from 'zod';

const UserAccountSchema = z.object({
    id: z.string(),
    username: z.string().optional(),
    account_type: z.string().optional(),
    profile_image: z.string().optional(),
    website_url: z.string().optional(),
    board_count: z.number().optional(),
    pin_count: z.number().optional(),
    follower_count: z.number().optional(),
    following_count: z.number().optional(),
    monthly_views: z.number().optional(),
    about: z.string().optional(),
    business_name: z.string().optional()
});

const ProviderAccountSchema = z.object({
    id: z.union([z.string(), z.number()]),
    username: z.string().nullish(),
    account_type: z.string().nullish(),
    profile_image: z.string().nullish(),
    website_url: z.string().nullish(),
    board_count: z.number().nullish(),
    pin_count: z.number().nullish(),
    follower_count: z.number().nullish(),
    following_count: z.number().nullish(),
    monthly_views: z.number().nullish(),
    about: z.string().nullish(),
    business_name: z.string().nullish()
});

const sync = createSync({
    description: 'Sync the connected user account profile as a single-record snapshot.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        UserAccount: UserAccountSchema
    },

    exec: async (nango) => {
        // Blocker: Pinterest GET /v5/user_account returns the current profile with no
        // updated_at filter, pagination, or cursor. Full refresh is required.
        await nango.trackDeletesStart('UserAccount');

        // https://developers.pinterest.com/docs/api/v5/#tag/user_account/GET/user_account
        const response = await nango.get({
            endpoint: '/v5/user_account',
            retries: 3
        });

        const parsed = ProviderAccountSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new Error(`Invalid user_account response: ${parsed.error.message}`);
        }

        const raw = parsed.data;
        const record = {
            id: String(raw.id),
            ...(raw.username != null && { username: raw.username }),
            ...(raw.account_type != null && { account_type: raw.account_type }),
            ...(raw.profile_image != null && { profile_image: raw.profile_image }),
            ...(raw.website_url != null && { website_url: raw.website_url }),
            ...(raw.board_count != null && { board_count: raw.board_count }),
            ...(raw.pin_count != null && { pin_count: raw.pin_count }),
            ...(raw.follower_count != null && { follower_count: raw.follower_count }),
            ...(raw.following_count != null && { following_count: raw.following_count }),
            ...(raw.monthly_views != null && { monthly_views: raw.monthly_views }),
            ...(raw.about != null && { about: raw.about }),
            ...(raw.business_name != null && { business_name: raw.business_name })
        };

        await nango.batchSave([record], 'UserAccount');
        await nango.trackDeletesEnd('UserAccount');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
