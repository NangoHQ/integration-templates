import { createSync } from 'nango';
import { z } from 'zod';
import { getDiscogsUsername } from '../helpers/get-discogs-username.js';

const ProfileSchema = z.object({
    id: z.string(),
    username: z.string(),
    name: z.string().optional(),
    home_page: z.string().optional(),
    location: z.string().optional(),
    profile: z.string().optional(),
    registered: z.string().optional(),
    rank: z.number().optional(),
    num_collection: z.number().optional(),
    num_wantlist: z.number().optional(),
    num_pending: z.number().optional(),
    num_for_sale: z.number().optional(),
    buyer_num_ratings: z.number().optional(),
    buyer_rating: z.number().optional(),
    seller_num_ratings: z.number().optional(),
    seller_rating: z.number().optional(),
    curr_abbr: z.string().optional(),
    releases_contributed: z.number().optional(),
    releases_rated: z.number().optional(),
    rating_avg: z.number().optional()
});

const ProviderProfileSchema = z
    .object({
        id: z.number(),
        username: z.string(),
        name: z.string().nullish(),
        home_page: z.string().nullish(),
        location: z.string().nullish(),
        profile: z.string().nullish(),
        registered: z.string().nullish(),
        rank: z.number().nullish(),
        num_collection: z.number().nullish(),
        num_wantlist: z.number().nullish(),
        num_pending: z.number().nullish(),
        num_for_sale: z.number().nullish(),
        buyer_num_ratings: z.number().nullish(),
        buyer_rating: z.number().nullish(),
        seller_num_ratings: z.number().nullish(),
        seller_rating: z.number().nullish(),
        curr_abbr: z.string().nullish(),
        releases_contributed: z.number().nullish(),
        releases_rated: z.number().nullish(),
        rating_avg: z.number().nullish()
    })
    .passthrough();

const sync = createSync({
    description: 'Sync the authenticated Discogs user profile.',
    version: '1.0.0',
    frequency: 'every day',
    autoStart: true,
    syncType: 'full',
    endpoints: [{ method: 'GET', path: '/profile', group: 'Profile' }],
    models: { Profile: ProfileSchema },

    exec: async (nango) => {
        const username = await getDiscogsUsername(nango);

        // https://www.discogs.com/developers#page:user-profile,header-user-profile-user-profile
        const response = await nango.get({
            endpoint: `/users/${encodeURIComponent(username)}`,
            retries: 3
        });

        const parsed = ProviderProfileSchema.parse(response.data);

        await nango.trackDeletesStart('Profile');

        const profile = {
            id: String(parsed.id),
            username: parsed.username,
            ...(parsed.name != null && { name: parsed.name }),
            ...(parsed.home_page != null && { home_page: parsed.home_page }),
            ...(parsed.location != null && { location: parsed.location }),
            ...(parsed.profile != null && { profile: parsed.profile }),
            ...(parsed.registered != null && { registered: parsed.registered }),
            ...(parsed.rank != null && { rank: parsed.rank }),
            ...(parsed.num_collection != null && { num_collection: parsed.num_collection }),
            ...(parsed.num_wantlist != null && { num_wantlist: parsed.num_wantlist }),
            ...(parsed.num_pending != null && { num_pending: parsed.num_pending }),
            ...(parsed.num_for_sale != null && { num_for_sale: parsed.num_for_sale }),
            ...(parsed.buyer_num_ratings != null && { buyer_num_ratings: parsed.buyer_num_ratings }),
            ...(parsed.buyer_rating != null && { buyer_rating: parsed.buyer_rating }),
            ...(parsed.seller_num_ratings != null && { seller_num_ratings: parsed.seller_num_ratings }),
            ...(parsed.seller_rating != null && { seller_rating: parsed.seller_rating }),
            ...(parsed.curr_abbr != null && { curr_abbr: parsed.curr_abbr }),
            ...(parsed.releases_contributed != null && { releases_contributed: parsed.releases_contributed }),
            ...(parsed.releases_rated != null && { releases_rated: parsed.releases_rated }),
            ...(parsed.rating_avg != null && { rating_avg: parsed.rating_avg })
        };

        await nango.batchSave([profile], 'Profile');
        await nango.trackDeletesEnd('Profile');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
