import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    weight: z.number().describe('The weight of the athlete in kilograms. Example: 70')
});

const ProviderAthleteSchema = z
    .object({
        id: z.number(),
        resource_state: z.number(),
        firstname: z.string(),
        lastname: z.string(),
        profile_medium: z.string().optional(),
        profile: z.string().optional(),
        city: z.string().nullable().optional(),
        state: z.string().nullable().optional(),
        country: z.string().nullable().optional(),
        sex: z.string().nullable().optional(),
        premium: z.boolean().optional(),
        summit: z.boolean().optional(),
        created_at: z.string(),
        updated_at: z.string(),
        follower_count: z.number().optional(),
        friend_count: z.number().optional(),
        measurement_preference: z.string().optional(),
        ftp: z.number().nullable().optional(),
        weight: z.number().nullable().optional(),
        clubs: z.array(z.unknown()).optional(),
        bikes: z.array(z.unknown()).optional(),
        shoes: z.array(z.unknown()).optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.number(),
    resource_state: z.number(),
    firstname: z.string(),
    lastname: z.string(),
    profile_medium: z.string().optional(),
    profile: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    sex: z.string().optional(),
    premium: z.boolean().optional(),
    summit: z.boolean().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    follower_count: z.number().optional(),
    friend_count: z.number().optional(),
    measurement_preference: z.string().optional(),
    ftp: z.number().optional(),
    weight: z.number().optional(),
    clubs: z.array(z.unknown()).optional(),
    bikes: z.array(z.unknown()).optional(),
    shoes: z.array(z.unknown()).optional()
});

const action = createAction({
    description: 'Update athlete profile fields.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['profile:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://developers.strava.com/docs/reference/#api-Athletes-updateLoggedInAthlete
            endpoint: '/api/v3/athlete',
            params: {
                weight: input.weight
            },
            retries: 3
        });

        const providerAthlete = ProviderAthleteSchema.parse(response.data);

        return {
            id: providerAthlete.id,
            resource_state: providerAthlete.resource_state,
            firstname: providerAthlete.firstname,
            lastname: providerAthlete.lastname,
            ...(providerAthlete.profile_medium !== undefined && { profile_medium: providerAthlete.profile_medium }),
            ...(providerAthlete.profile !== undefined && { profile: providerAthlete.profile }),
            ...(providerAthlete.city != null && { city: providerAthlete.city }),
            ...(providerAthlete.state != null && { state: providerAthlete.state }),
            ...(providerAthlete.country != null && { country: providerAthlete.country }),
            ...(providerAthlete.sex != null && { sex: providerAthlete.sex }),
            ...(providerAthlete.premium !== undefined && { premium: providerAthlete.premium }),
            ...(providerAthlete.summit !== undefined && { summit: providerAthlete.summit }),
            created_at: providerAthlete.created_at,
            updated_at: providerAthlete.updated_at,
            ...(providerAthlete.follower_count !== undefined && { follower_count: providerAthlete.follower_count }),
            ...(providerAthlete.friend_count !== undefined && { friend_count: providerAthlete.friend_count }),
            ...(providerAthlete.measurement_preference !== undefined && { measurement_preference: providerAthlete.measurement_preference }),
            ...(providerAthlete.ftp != null && { ftp: providerAthlete.ftp }),
            ...(providerAthlete.weight != null && { weight: providerAthlete.weight }),
            ...(providerAthlete.clubs !== undefined && { clubs: providerAthlete.clubs }),
            ...(providerAthlete.bikes !== undefined && { bikes: providerAthlete.bikes }),
            ...(providerAthlete.shoes !== undefined && { shoes: providerAthlete.shoes })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
