import { createSync } from 'nango';
import { z } from 'zod';

const UserMeResponseSchema = z.object({
    data: z
        .object({
            id: z.string(),
            name: z.string(),
            username: z.string()
        })
        .passthrough()
});

// https://docs.x.com/x-api/users/get-my-user
const UserSchema = z.object({
    id: z.string(),
    name: z.string(),
    username: z.string(),
    created_at: z.string().optional(),
    description: z.string().optional(),
    location: z.string().optional(),
    profile_image_url: z.string().optional(),
    protected: z.boolean().optional(),
    public_metrics: z
        .object({
            followers_count: z.number().optional(),
            following_count: z.number().optional(),
            tweet_count: z.number().optional(),
            listed_count: z.number().optional(),
            like_count: z.number().optional()
        })
        .optional(),
    url: z.string().optional(),
    verified: z.boolean().optional(),
    verified_type: z.string().optional(),
    subscription_type: z.string().optional()
});

const sync = createSync({
    description: 'Sync users from Twitter/X',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        User: UserSchema
    },
    endpoints: [{ method: 'GET', path: '/syncs/users' }],

    exec: async (nango) => {
        // https://docs.x.com/x-api/users/get-my-user
        const response = await nango.get({
            endpoint: '/2/users/me',
            params: {
                'user.fields': 'created_at,description,location,profile_image_url,protected,public_metrics,url,verified,verified_type,subscription_type'
            },
            retries: 3
        });

        const parsed = UserMeResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new Error(`Unexpected /2/users/me response shape: ${parsed.error.message}`);
        }
        // Use the raw response for field access — schema validated the required shape above
        const userData = response.data.data;

        const user: z.infer<typeof UserSchema> = {
            id: userData.id,
            name: userData.name,
            username: userData.username,
            ...(userData.created_at !== undefined && { created_at: userData.created_at }),
            ...(userData.description !== undefined && { description: userData.description }),
            ...(userData.location !== undefined && { location: userData.location }),
            ...(userData.profile_image_url !== undefined && { profile_image_url: userData.profile_image_url }),
            ...(userData.protected !== undefined && { protected: userData.protected }),
            ...(userData.public_metrics !== undefined && {
                public_metrics: {
                    ...(userData.public_metrics.followers_count !== undefined && {
                        followers_count: userData.public_metrics.followers_count
                    }),
                    ...(userData.public_metrics.following_count !== undefined && {
                        following_count: userData.public_metrics.following_count
                    }),
                    ...(userData.public_metrics.tweet_count !== undefined && {
                        tweet_count: userData.public_metrics.tweet_count
                    }),
                    ...(userData.public_metrics.listed_count !== undefined && {
                        listed_count: userData.public_metrics.listed_count
                    }),
                    ...(userData.public_metrics.like_count !== undefined && {
                        like_count: userData.public_metrics.like_count
                    })
                }
            }),
            ...(userData.url !== undefined && { url: userData.url }),
            ...(userData.verified !== undefined && { verified: userData.verified }),
            ...(userData.verified_type !== undefined && { verified_type: userData.verified_type }),
            ...(userData.subscription_type !== undefined && { subscription_type: userData.subscription_type })
        };

        await nango.batchSave([user], 'User');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
