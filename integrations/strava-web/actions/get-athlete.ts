import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderAthleteSchema = z.object({
    id: z.number().describe('Athlete ID. Example: 943379048'),
    username: z.string().nullable().optional(),
    resource_state: z.number().optional(),
    firstname: z.string().nullable().optional(),
    lastname: z.string().nullable().optional(),
    bio: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    sex: z.string().nullable().optional(),
    premium: z.boolean().optional(),
    summit: z.boolean().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
    badge_type_id: z.number().optional(),
    weight: z.number().nullable().optional(),
    profile_medium: z.string().nullable().optional(),
    profile: z.string().nullable().optional(),
    friend: z.unknown().optional(),
    follower: z.unknown().optional(),
    email: z.string().nullable().optional(),
    ftp: z.number().nullable().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    username: z.string().optional(),
    firstname: z.string().optional(),
    lastname: z.string().optional(),
    bio: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    sex: z.string().optional(),
    premium: z.boolean().optional(),
    summit: z.boolean().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    badge_type_id: z.number().optional(),
    weight: z.number().optional(),
    profile_medium: z.string().optional(),
    profile: z.string().optional(),
    email: z.string().optional(),
    ftp: z.number().optional()
});

const action = createAction({
    description: 'Get authenticated athlete.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read', 'profile:read_all'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.strava.com/docs/reference/#api-Athletes-getLoggedInAthlete
            endpoint: '/api/v3/athlete',
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Athlete not found'
            });
        }

        const athlete = ProviderAthleteSchema.parse(response.data);

        return {
            id: athlete.id,
            ...(athlete.username != null && { username: athlete.username }),
            ...(athlete.firstname != null && { firstname: athlete.firstname }),
            ...(athlete.lastname != null && { lastname: athlete.lastname }),
            ...(athlete.bio != null && { bio: athlete.bio }),
            ...(athlete.city != null && { city: athlete.city }),
            ...(athlete.state != null && { state: athlete.state }),
            ...(athlete.country != null && { country: athlete.country }),
            ...(athlete.sex != null && { sex: athlete.sex }),
            ...(athlete.premium !== undefined && { premium: athlete.premium }),
            ...(athlete.summit !== undefined && { summit: athlete.summit }),
            ...(athlete.created_at != null && { created_at: athlete.created_at }),
            ...(athlete.updated_at != null && { updated_at: athlete.updated_at }),
            ...(athlete.badge_type_id !== undefined && { badge_type_id: athlete.badge_type_id }),
            ...(athlete.weight != null && { weight: athlete.weight }),
            ...(athlete.profile_medium != null && { profile_medium: athlete.profile_medium }),
            ...(athlete.profile != null && { profile: athlete.profile }),
            ...(athlete.email != null && { email: athlete.email }),
            ...(athlete.ftp != null && { ftp: athlete.ftp })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
