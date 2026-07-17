import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const SummaryClubSchema = z.object({
    id: z.number()
});

const SummaryActivitySchema = z.object({
    id: z.number().optional(),
    guid: z.string().nullable().optional(),
    external_id: z.string().nullable().optional(),
    upload_id: z.number().optional(),
    name: z.string().optional(),
    distance: z.number().optional(),
    moving_time: z.number().optional(),
    elapsed_time: z.number().optional(),
    total_elevation_gain: z.number().optional(),
    type: z.string().optional(),
    sport_type: z.string().optional(),
    start_date: z.string().optional(),
    start_date_local: z.string().optional(),
    timezone: z.string().optional(),
    utc_offset: z.number().optional(),
    achievement_count: z.number().optional(),
    kudos_count: z.number().optional(),
    comment_count: z.number().optional(),
    athlete_count: z.number().optional(),
    photo_count: z.number().optional(),
    map: z
        .object({
            id: z.string().optional(),
            summary_polyline: z.string().nullable().optional()
        })
        .optional(),
    trainer: z.boolean().optional(),
    commute: z.boolean().optional(),
    manual: z.boolean().optional(),
    private: z.boolean().optional(),
    flagged: z.boolean().optional(),
    gear_id: z.string().nullable().optional(),
    average_speed: z.number().optional(),
    max_speed: z.number().optional(),
    average_cadence: z.number().optional(),
    average_temp: z.number().optional(),
    average_watts: z.number().optional(),
    weighted_average_watts: z.number().optional(),
    kilojoules: z.number().optional(),
    device_watts: z.boolean().optional(),
    has_heartrate: z.boolean().optional(),
    max_watts: z.number().optional(),
    elev_high: z.number().optional(),
    elev_low: z.number().optional(),
    pr_count: z.number().optional(),
    total_photo_count: z.number().optional(),
    has_kudoed: z.boolean().optional(),
    workout_type: z.number().nullable().optional(),
    athlete: z
        .object({
            id: z.number().optional(),
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
    start_date: z.string().optional(),
    start_date_local: z.string().optional(),
    timezone: z.string().optional(),
    utc_offset: z.number().optional(),
    achievement_count: z.number().optional(),
    kudos_count: z.number().optional(),
    comment_count: z.number().optional(),
    athlete_count: z.number().optional(),
    photo_count: z.number().optional(),
    map: z
        .object({
            id: z.string().optional(),
            summary_polyline: z.string().nullable().optional()
        })
        .optional(),
    trainer: z.boolean().optional(),
    commute: z.boolean().optional(),
    manual: z.boolean().optional(),
    private: z.boolean().optional(),
    flagged: z.boolean().optional(),
    gear_id: z.string().nullable().optional(),
    average_speed: z.number().optional(),
    max_speed: z.number().optional(),
    average_cadence: z.number().optional(),
    average_temp: z.number().optional(),
    average_watts: z.number().optional(),
    weighted_average_watts: z.number().optional(),
    kilojoules: z.number().optional(),
    device_watts: z.boolean().optional(),
    has_heartrate: z.boolean().optional(),
    max_watts: z.number().optional(),
    elev_high: z.number().optional(),
    elev_low: z.number().optional(),
    pr_count: z.number().optional(),
    total_photo_count: z.number().optional(),
    has_kudoed: z.boolean().optional(),
    workout_type: z.number().nullable().optional(),
    athlete: z
        .object({
            id: z.number().optional(),
            resource_state: z.number().optional()
        })
        .optional()
});

const CheckpointSchema = z.object({
    after: z.number().int().nonnegative(),
    club_ids: z.string()
});

function haveSameClubIds(left: number[], right: number[]): boolean {
    if (left.length !== right.length) {
        return false;
    }

    return left.every((clubId, index) => clubId === right[index]);
}

function serializeClubIds(clubIds: number[]): string {
    return clubIds.join(',');
}

function deserializeClubIds(value: string): number[] {
    if (!value) {
        return [];
    }

    return value.split(',').map((clubId) => Number(clubId));
}

function toEpochSeconds(value: string | undefined): number | undefined {
    if (!value) {
        return undefined;
    }

    const timestamp = new Date(value).getTime();
    return Number.isNaN(timestamp) ? undefined : Math.floor(timestamp / 1000);
}

function getClubActivityId(activity: z.infer<typeof SummaryActivitySchema>): string {
    if (activity.id !== undefined) {
        return String(activity.id);
    }

    if (activity.guid) {
        return activity.guid;
    }

    if (activity.external_id) {
        return activity.external_id;
    }

    if (activity.upload_id !== undefined) {
        return String(activity.upload_id);
    }

    const syntheticIdParts = [
        activity.athlete?.id !== undefined ? String(activity.athlete.id) : undefined,
        activity.athlete?.firstname,
        activity.athlete?.lastname,
        activity.name,
        activity.start_date,
        activity.start_date_local,
        activity.distance !== undefined ? String(activity.distance) : undefined,
        activity.moving_time !== undefined ? String(activity.moving_time) : undefined,
        activity.elapsed_time !== undefined ? String(activity.elapsed_time) : undefined,
        activity.total_elevation_gain !== undefined ? String(activity.total_elevation_gain) : undefined,
        activity.type,
        activity.sport_type,
        activity.workout_type !== undefined && activity.workout_type !== null ? String(activity.workout_type) : undefined
    ].filter((value): value is string => Boolean(value));

    if (syntheticIdParts.length === 0) {
        throw new Error('Club activity response did not include a usable identifier');
    }

    return syntheticIdParts.join('|');
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
        ...(activity.start_date !== undefined && { start_date: activity.start_date }),
        ...(activity.start_date_local !== undefined && { start_date_local: activity.start_date_local }),
        ...(activity.timezone !== undefined && { timezone: activity.timezone }),
        ...(activity.utc_offset !== undefined && { utc_offset: activity.utc_offset }),
        ...(activity.achievement_count !== undefined && { achievement_count: activity.achievement_count }),
        ...(activity.kudos_count !== undefined && { kudos_count: activity.kudos_count }),
        ...(activity.comment_count !== undefined && { comment_count: activity.comment_count }),
        ...(activity.athlete_count !== undefined && { athlete_count: activity.athlete_count }),
        ...(activity.photo_count !== undefined && { photo_count: activity.photo_count }),
        ...(activity.map !== undefined && {
            map: {
                ...(activity.map.id !== undefined && { id: activity.map.id }),
                ...(activity.map.summary_polyline !== undefined && { summary_polyline: activity.map.summary_polyline })
            }
        }),
        ...(activity.trainer !== undefined && { trainer: activity.trainer }),
        ...(activity.commute !== undefined && { commute: activity.commute }),
        ...(activity.manual !== undefined && { manual: activity.manual }),
        ...(activity.private !== undefined && { private: activity.private }),
        ...(activity.flagged !== undefined && { flagged: activity.flagged }),
        ...(activity.gear_id !== undefined && { gear_id: activity.gear_id }),
        ...(activity.average_speed !== undefined && { average_speed: activity.average_speed }),
        ...(activity.max_speed !== undefined && { max_speed: activity.max_speed }),
        ...(activity.average_cadence !== undefined && { average_cadence: activity.average_cadence }),
        ...(activity.average_temp !== undefined && { average_temp: activity.average_temp }),
        ...(activity.average_watts !== undefined && { average_watts: activity.average_watts }),
        ...(activity.weighted_average_watts !== undefined && { weighted_average_watts: activity.weighted_average_watts }),
        ...(activity.kilojoules !== undefined && { kilojoules: activity.kilojoules }),
        ...(activity.device_watts !== undefined && { device_watts: activity.device_watts }),
        ...(activity.has_heartrate !== undefined && { has_heartrate: activity.has_heartrate }),
        ...(activity.max_watts !== undefined && { max_watts: activity.max_watts }),
        ...(activity.elev_high !== undefined && { elev_high: activity.elev_high }),
        ...(activity.elev_low !== undefined && { elev_low: activity.elev_low }),
        ...(activity.pr_count !== undefined && { pr_count: activity.pr_count }),
        ...(activity.total_photo_count !== undefined && { total_photo_count: activity.total_photo_count }),
        ...(activity.has_kudoed !== undefined && { has_kudoed: activity.has_kudoed }),
        ...(activity.workout_type !== undefined && { workout_type: activity.workout_type }),
        ...(activity.athlete !== undefined && {
            athlete: {
                ...(activity.athlete.id !== undefined && { id: activity.athlete.id }),
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
    checkpoint: CheckpointSchema,
    models: {
        ClubActivity: ClubActivitySchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : { after: 0, club_ids: '' };
        const previousAfter = checkpoint.after > 0 ? checkpoint.after : undefined;
        const previousClubIds = deserializeClubIds(checkpoint.club_ids);

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

        const clubIds = clubs.map((club) => club.id).sort((left, right) => left - right);
        // A changed club set means the saved timestamp may no longer describe the
        // current feed, so fall back to a full crawl before resuming incremental reads.
        const shouldFullRefresh = previousAfter === undefined || !haveSameClubIds(previousClubIds, clubIds);
        const incrementalAfter = shouldFullRefresh ? undefined : previousAfter;
        let maxStartDateEpoch = shouldFullRefresh ? undefined : previousAfter;

        if (shouldFullRefresh) {
            await nango.trackDeletesStart('ClubActivity');
        }

        if (clubs.length > 0) {
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
                    const records: Array<z.infer<typeof ClubActivitySchema>> = [];
                    let pageContainsOnlyCheckpointOrOlderActivities = incrementalAfter !== undefined && activities.length > 0;

                    for (const item of activities) {
                        const parsed = SummaryActivitySchema.safeParse(item);
                        if (!parsed.success) {
                            throw new Error(`Failed to parse activity: ${parsed.error.message}`);
                        }

                        const activity = parsed.data;
                        const startDateEpoch = toEpochSeconds(activity.start_date);
                        if (startDateEpoch !== undefined && (maxStartDateEpoch === undefined || startDateEpoch > maxStartDateEpoch)) {
                            maxStartDateEpoch = startDateEpoch;
                        }

                        const isCheckpointOrOlder = incrementalAfter !== undefined && startDateEpoch !== undefined && startDateEpoch <= incrementalAfter;
                        if (!isCheckpointOrOlder) {
                            pageContainsOnlyCheckpointOrOlderActivities = false;
                        }

                        if (isCheckpointOrOlder) {
                            continue;
                        }

                        records.push(mapSummaryActivityToClubActivity(activity));
                    }

                    if (records.length > 0) {
                        await nango.batchSave(records, 'ClubActivity');
                    }

                    if (pageContainsOnlyCheckpointOrOlderActivities) {
                        break;
                    }
                }
            }
        }

        if (shouldFullRefresh) {
            await nango.trackDeletesEnd('ClubActivity');
        }

        await nango.saveCheckpoint({
            after: maxStartDateEpoch ?? 0,
            club_ids: serializeClubIds(clubIds)
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
