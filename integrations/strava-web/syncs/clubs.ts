import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderClubSchema = z.object({
    id: z.number().describe("The club's unique identifier"),
    resource_state: z.number().optional(),
    name: z.string().optional().describe("The club's name"),
    profile_medium: z.string().optional().describe('URL to a 60x60 pixel profile picture'),
    cover_photo: z.string().optional().describe('URL to a ~1185x580 pixel cover photo'),
    cover_photo_small: z.string().optional().describe('URL to a ~360x176 pixel cover photo'),
    sport_type: z.string().optional().describe('Deprecated. Prefer to use activity_types'),
    activity_types: z.array(z.string()).optional().describe('The activity types that count for a club'),
    city: z.string().optional().describe("The club's city"),
    state: z.string().optional().describe("The club's state or geographical region"),
    country: z.string().optional().describe("The club's country"),
    private: z.boolean().optional().describe('Whether the club is private'),
    member_count: z.number().optional().describe("The club's member count"),
    featured: z.boolean().optional().describe('Whether the club is featured or not'),
    verified: z.boolean().optional().describe('Whether the club is verified or not'),
    url: z.string().optional().describe("The club's vanity URL")
});

const ClubSchema = z.object({
    id: z.string().describe("The club's unique identifier"),
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
    url: z.string().optional()
});

const sync = createSync({
    description: 'Sync clubs.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Club: ClubSchema
    },

    exec: async (nango) => {
        // Blocker: Strava's GET /api/v3/athlete/clubs does not support
        // updated_after, modified_since, or any incremental filter, cursor,
        // or deleted-record endpoint. It always returns the full snapshot of
        // the authenticated athlete's club memberships.
        await nango.trackDeletesStart('Club');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.strava.com/docs/reference/#api-Clubs-getLoggedInAthleteClubs
            endpoint: '/api/v3/athlete/clubs',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_calculation_method: 'per-page',
                offset_start_value: 1,
                limit_name_in_request: 'per_page',
                limit: 30
            },
            retries: 3
        };

        for await (const clubs of nango.paginate(proxyConfig)) {
            const parsed = z.array(ProviderClubSchema).safeParse(clubs);
            if (!parsed.success) {
                throw new Error(`Failed to parse clubs: ${parsed.error.message}`);
            }

            const records = parsed.data.map((club) => ({
                id: String(club.id),
                ...(club.resource_state !== undefined && { resource_state: club.resource_state }),
                ...(club.name !== undefined && { name: club.name }),
                ...(club.profile_medium !== undefined && { profile_medium: club.profile_medium }),
                ...(club.cover_photo !== undefined && { cover_photo: club.cover_photo }),
                ...(club.cover_photo_small !== undefined && { cover_photo_small: club.cover_photo_small }),
                ...(club.sport_type !== undefined && { sport_type: club.sport_type }),
                ...(club.activity_types !== undefined && { activity_types: club.activity_types }),
                ...(club.city !== undefined && { city: club.city }),
                ...(club.state !== undefined && { state: club.state }),
                ...(club.country !== undefined && { country: club.country }),
                ...(club.private !== undefined && { private: club.private }),
                ...(club.member_count !== undefined && { member_count: club.member_count }),
                ...(club.featured !== undefined && { featured: club.featured }),
                ...(club.verified !== undefined && { verified: club.verified }),
                ...(club.url !== undefined && { url: club.url })
            }));

            if (records.length > 0) {
                await nango.batchSave(records, 'Club');
            }
        }

        await nango.trackDeletesEnd('Club');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
