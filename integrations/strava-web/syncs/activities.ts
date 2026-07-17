import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MetaAthleteSchema = z.object({
    id: z.number().int(),
    resource_state: z.number().int().nullable().optional()
});

const PolylineMapSchema = z.object({
    id: z.string(),
    polyline: z.string().nullable().optional(),
    summary_polyline: z.string().nullable().optional(),
    resource_state: z.number().int().nullable().optional()
});

const SummaryActivitySchema = z.object({
    id: z.number().int(),
    resource_state: z.number().int().nullable().optional(),
    external_id: z.string().nullable().optional(),
    upload_id: z.number().int().nullable().optional(),
    athlete: MetaAthleteSchema.nullable().optional(),
    name: z.string().nullable().optional(),
    distance: z.number().nullable().optional(),
    moving_time: z.number().int().nullable().optional(),
    elapsed_time: z.number().int().nullable().optional(),
    total_elevation_gain: z.number().nullable().optional(),
    type: z.string().nullable().optional(),
    sport_type: z.string().nullable().optional(),
    start_date: z.string().nullable().optional(),
    start_date_local: z.string().nullable().optional(),
    timezone: z.string().nullable().optional(),
    utc_offset: z.number().nullable().optional(),
    achievement_count: z.number().int().nullable().optional(),
    kudos_count: z.number().int().nullable().optional(),
    comment_count: z.number().int().nullable().optional(),
    athlete_count: z.number().int().nullable().optional(),
    photo_count: z.number().int().nullable().optional(),
    total_photo_count: z.number().int().nullable().optional(),
    map: PolylineMapSchema.nullable().optional(),
    trainer: z.boolean().nullable().optional(),
    commute: z.boolean().nullable().optional(),
    manual: z.boolean().nullable().optional(),
    private: z.boolean().nullable().optional(),
    flagged: z.boolean().nullable().optional(),
    gear_id: z.string().nullable().optional(),
    from_accepted_tag: z.boolean().nullable().optional(),
    average_speed: z.number().nullable().optional(),
    max_speed: z.number().nullable().optional(),
    average_cadence: z.number().nullable().optional(),
    average_temp: z.number().nullable().optional(),
    average_watts: z.number().nullable().optional(),
    weighted_average_watts: z.number().nullable().optional(),
    kilojoules: z.number().nullable().optional(),
    device_watts: z.boolean().nullable().optional(),
    has_heartrate: z.boolean().nullable().optional(),
    max_watts: z.number().int().nullable().optional(),
    elev_high: z.number().nullable().optional(),
    elev_low: z.number().nullable().optional(),
    pr_count: z.number().int().nullable().optional(),
    has_kudoed: z.boolean().nullable().optional(),
    workout_type: z.number().int().nullable().optional(),
    description: z.string().nullable().optional(),
    calories: z.number().nullable().optional()
});

const ActivitySchema = z.object({
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
    average_speed: z.number().optional(),
    max_speed: z.number().optional(),
    average_watts: z.number().optional(),
    max_watts: z.number().optional(),
    kilojoules: z.number().optional(),
    description: z.string().optional(),
    trainer: z.boolean().optional(),
    commute: z.boolean().optional(),
    manual: z.boolean().optional(),
    private: z.boolean().optional(),
    flagged: z.boolean().optional(),
    gear_id: z.string().optional(),
    workout_type: z.number().optional(),
    has_heartrate: z.boolean().optional(),
    external_id: z.string().optional(),
    upload_id: z.number().optional(),
    athlete_id: z.string().optional(),
    map_id: z.string().optional(),
    map_polyline: z.string().optional(),
    map_summary_polyline: z.string().optional()
});

const sync = createSync({
    description: 'Sync activities.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Activity: ActivitySchema
    },
    scopes: ['activity:read', 'activity:read_all'],

    // Full refresh with delete tracking on every run: Strava's /athlete/activities only
    // supports filtering by `after`/`before` activity start time, not by modification time, so
    // an incremental cursor would miss edits (renames, privacy changes) to already-synced
    // activities and would never detect deletions. A full snapshot is the only approach that
    // matches what this endpoint can actually express.
    exec: async (nango) => {
        const limit = 30;

        const proxyConfig: ProxyConfiguration = {
            // https://developers.strava.com/docs/reference/#api-Activities-getLoggedInAthleteActivities
            endpoint: '/api/v3/athlete/activities',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit
            },
            retries: 3
        };

        await nango.trackDeletesStart('Activity');

        for await (const page of nango.paginate<z.infer<typeof SummaryActivitySchema>>(proxyConfig)) {
            const activities = page.map((record) => {
                const parsed = SummaryActivitySchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Failed to parse activity: ${parsed.error.message}`);
                }

                const activity = parsed.data;
                return {
                    id: String(activity.id),
                    name: activity.name ?? undefined,
                    distance: activity.distance ?? undefined,
                    moving_time: activity.moving_time ?? undefined,
                    elapsed_time: activity.elapsed_time ?? undefined,
                    total_elevation_gain: activity.total_elevation_gain ?? undefined,
                    type: activity.type ?? undefined,
                    sport_type: activity.sport_type ?? undefined,
                    start_date: activity.start_date ?? undefined,
                    start_date_local: activity.start_date_local ?? undefined,
                    timezone: activity.timezone ?? undefined,
                    utc_offset: activity.utc_offset ?? undefined,
                    average_speed: activity.average_speed ?? undefined,
                    max_speed: activity.max_speed ?? undefined,
                    average_watts: activity.average_watts ?? undefined,
                    max_watts: activity.max_watts ?? undefined,
                    kilojoules: activity.kilojoules ?? undefined,
                    description: activity.description ?? undefined,
                    trainer: activity.trainer ?? undefined,
                    commute: activity.commute ?? undefined,
                    manual: activity.manual ?? undefined,
                    private: activity.private ?? undefined,
                    flagged: activity.flagged ?? undefined,
                    gear_id: activity.gear_id ?? undefined,
                    workout_type: activity.workout_type ?? undefined,
                    has_heartrate: activity.has_heartrate ?? undefined,
                    external_id: activity.external_id ?? undefined,
                    upload_id: activity.upload_id ?? undefined,
                    athlete_id: activity.athlete ? String(activity.athlete.id) : undefined,
                    map_id: activity.map?.id,
                    map_polyline: activity.map?.polyline ?? undefined,
                    map_summary_polyline: activity.map?.summary_polyline ?? undefined
                };
            });

            if (activities.length > 0) {
                await nango.batchSave(activities, 'Activity');
            }
        }

        await nango.trackDeletesEnd('Activity');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
