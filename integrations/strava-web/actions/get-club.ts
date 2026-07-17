import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('The identifier of the club. Example: 1')
});

const ProviderClubSchema = z.object({
    id: z.number(),
    resource_state: z.number().nullish(),
    name: z.string().nullish(),
    profile_medium: z.string().nullish(),
    cover_photo: z.string().nullish(),
    cover_photo_small: z.string().nullish(),
    sport_type: z.string().nullish(),
    activity_types: z.array(z.string()).nullish(),
    city: z.string().nullish(),
    state: z.string().nullish(),
    country: z.string().nullish(),
    private: z.boolean().nullish(),
    member_count: z.number().nullish(),
    featured: z.boolean().nullish(),
    verified: z.boolean().nullish(),
    url: z.string().nullish(),
    membership: z.string().nullish(),
    admin: z.boolean().nullish(),
    owner: z.boolean().nullish(),
    following_count: z.number().nullish()
});

const OutputSchema = z.object({
    id: z.number(),
    resource_state: z.number().optional(),
    name: z.string().optional(),
    profile_medium: z.string().optional(),
    cover_photo: z.string().optional(),
    cover_photo_small: z.string().optional(),
    sport_type: z.string().optional(),
    activity_types: z.array(z.string()).optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    private: z.boolean().optional(),
    member_count: z.number().optional(),
    featured: z.boolean().optional(),
    verified: z.boolean().optional(),
    url: z.string().optional(),
    membership: z.string().optional(),
    admin: z.boolean().optional(),
    owner: z.boolean().optional(),
    following_count: z.number().optional()
});

const action = createAction({
    description: 'Retrieve a club.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.strava.com/docs/reference/#api-Clubs-getClubById
        const response = await nango.get({
            endpoint: `/api/v3/clubs/${encodeURIComponent(String(input.id))}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Club not found',
                id: input.id
            });
        }

        const providerClub = ProviderClubSchema.parse(response.data);

        return {
            id: providerClub.id,
            ...(providerClub.resource_state != null && { resource_state: providerClub.resource_state }),
            ...(providerClub.name != null && { name: providerClub.name }),
            ...(providerClub.profile_medium != null && { profile_medium: providerClub.profile_medium }),
            ...(providerClub.cover_photo != null && { cover_photo: providerClub.cover_photo }),
            ...(providerClub.cover_photo_small != null && { cover_photo_small: providerClub.cover_photo_small }),
            ...(providerClub.sport_type != null && { sport_type: providerClub.sport_type }),
            ...(providerClub.activity_types != null && { activity_types: providerClub.activity_types }),
            ...(providerClub.city != null && { city: providerClub.city }),
            ...(providerClub.state != null && { state: providerClub.state }),
            ...(providerClub.country != null && { country: providerClub.country }),
            ...(providerClub.private != null && { private: providerClub.private }),
            ...(providerClub.member_count != null && { member_count: providerClub.member_count }),
            ...(providerClub.featured != null && { featured: providerClub.featured }),
            ...(providerClub.verified != null && { verified: providerClub.verified }),
            ...(providerClub.url != null && { url: providerClub.url }),
            ...(providerClub.membership != null && { membership: providerClub.membership }),
            ...(providerClub.admin != null && { admin: providerClub.admin }),
            ...(providerClub.owner != null && { owner: providerClub.owner }),
            ...(providerClub.following_count != null && { following_count: providerClub.following_count })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
