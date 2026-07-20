import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const SummaryClubSchema = z.object({
    id: z.number()
});

// Strava's club activity feed (GET /clubs/{id}/activities) never includes an id, guid,
// external_id, upload_id, or any timestamp for the individual activities it lists - even
// for the requesting athlete's own posts. Verified against the live API: the response only
// ever contains the fields below. This means there is no way to uniquely and stably identify
// an individual club activity, nor any way to detect when one has been edited or removed.
const SummaryActivitySchema = z.object({
    resource_state: z.number().optional(),
    name: z.string().optional(),
    distance: z.number().optional(),
    moving_time: z.number().optional(),
    elapsed_time: z.number().optional(),
    total_elevation_gain: z.number().optional(),
    type: z.string().optional(),
    sport_type: z.string().optional(),
    workout_type: z.number().nullable().optional(),
    athlete: z
        .object({
            resource_state: z.number().optional(),
            firstname: z.string().optional(),
            lastname: z.string().optional()
        })
        .optional()
});

const ClubActivitySchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    distance: z.number().optional(),
    moving_time: z.number().optional(),
    elapsed_time: z.number().optional(),
    total_elevation_gain: z.number().optional(),
    type: z.string().optional(),
    sport_type: z.string().optional(),
    workout_type: z.number().nullable().optional(),
    athlete: z
        .object({
            resource_state: z.number().optional()
        })
        .optional()
});

// Strava never returns a stable identifier for these records (see SummaryActivitySchema),
// so this composite key is the closest approximation of uniqueness available. Distinct
// activities with matching athlete name, stats, and type can still collide onto the same
// id; because delete tracking is intentionally not used for this model (see below), a
// collision only overwrites the stored record rather than causing data loss through an
// incorrect deletion.
function getClubActivityId(activity: z.infer<typeof SummaryActivitySchema>): string {
    const idParts = [
        activity.athlete?.firstname,
        activity.athlete?.lastname,
        activity.name,
        activity.distance !== undefined ? String(activity.distance) : undefined,
        activity.moving_time !== undefined ? String(activity.moving_time) : undefined,
        activity.elapsed_time !== undefined ? String(activity.elapsed_time) : undefined,
        activity.total_elevation_gain !== undefined ? String(activity.total_elevation_gain) : undefined,
        activity.type,
        activity.sport_type,
        activity.workout_type !== undefined && activity.workout_type !== null ? String(activity.workout_type) : undefined
    ].filter((value): value is string => Boolean(value));

    if (idParts.length === 0) {
        throw new Error('Club activity response did not include enough fields to build an identifier');
    }

    return idParts.join('|');
}

function mapSummaryActivityToClubActivity(activity: z.infer<typeof SummaryActivitySchema>): z.infer<typeof ClubActivitySchema> {
    return {
        id: getClubActivityId(activity),
        ...(activity.name !== undefined && { name: activity.name }),
        ...(activity.distance !== undefined && { distance: activity.distance }),
        ...(activity.moving_time !== undefined && { moving_time: activity.moving_time }),
        ...(activity.elapsed_time !== undefined && { elapsed_time: activity.elapsed_time }),
        ...(activity.total_elevation_gain !== undefined && { total_elevation_gain: activity.total_elevation_gain }),
        ...(activity.type !== undefined && { type: activity.type }),
        ...(activity.sport_type !== undefined && { sport_type: activity.sport_type }),
        ...(activity.workout_type !== undefined && { workout_type: activity.workout_type }),
        ...(activity.athlete !== undefined && {
            athlete: {
                ...(activity.athlete.resource_state !== undefined && { resource_state: activity.athlete.resource_state })
            }
        })
    };
}

const sync = createSync({
    description: 'Sync club activities.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        ClubActivity: ClubActivitySchema
    },

    // No checkpoint or delete tracking: Strava's club activity feed only ever returns a
    // recent, bounded window of activity (it is not a full historical enumeration), so there
    // is no reliable way to detect deletions, and no timestamp field to resume from
    // incrementally. Every run re-fetches and upserts the current feed for each club.
    exec: async (nango) => {
        const clubsConfig: ProxyConfiguration = {
            // https://developers.strava.com/docs/reference/#api-Clubs-getLoggedInAthleteClubs
            endpoint: '/api/v3/athlete/clubs',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 30
            },
            retries: 3
        };

        const clubs: Array<z.infer<typeof SummaryClubSchema>> = [];
        for await (const page of nango.paginate(clubsConfig)) {
            for (const item of page) {
                const parsed = SummaryClubSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse club: ${parsed.error.message}`);
                }
                clubs.push(parsed.data);
            }
        }

        for (const club of clubs) {
            const activitiesConfig: ProxyConfiguration = {
                // https://developers.strava.com/docs/reference/#api-Clubs-getClubActivitiesById
                endpoint: `/api/v3/clubs/${encodeURIComponent(String(club.id))}/activities`,
                paginate: {
                    type: 'offset',
                    offset_name_in_request: 'page',
                    offset_start_value: 1,
                    offset_calculation_method: 'per-page',
                    limit_name_in_request: 'per_page',
                    limit: 30
                },
                retries: 3
            };

            for await (const activities of nango.paginate(activitiesConfig)) {
                const records = activities.map((item) => {
                    const parsed = SummaryActivitySchema.safeParse(item);
                    if (!parsed.success) {
                        throw new Error(`Failed to parse activity: ${parsed.error.message}`);
                    }

                    return mapSummaryActivityToClubActivity(parsed.data);
                });

                if (records.length > 0) {
                    await nango.batchSave(records, 'ClubActivity');
                }
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
