import { z } from 'zod';
import { createAction } from 'nango';

const ActivityTotalSchema = z.object({
    count: z.number().optional(),
    distance: z.number().optional(),
    moving_time: z.number().optional(),
    elapsed_time: z.number().optional(),
    elevation_gain: z.number().optional(),
    achievement_count: z.number().optional()
});

const ActivityStatsSchema = z.object({
    biggest_ride_distance: z.number().optional(),
    biggest_climb_elevation_gain: z.number().optional(),
    recent_ride_totals: ActivityTotalSchema.optional(),
    recent_run_totals: ActivityTotalSchema.optional(),
    recent_swim_totals: ActivityTotalSchema.optional(),
    ytd_ride_totals: ActivityTotalSchema.optional(),
    ytd_run_totals: ActivityTotalSchema.optional(),
    ytd_swim_totals: ActivityTotalSchema.optional(),
    all_ride_totals: ActivityTotalSchema.optional(),
    all_run_totals: ActivityTotalSchema.optional(),
    all_swim_totals: ActivityTotalSchema.optional()
});

const InputSchema = z.object({
    athlete_id: z.number().describe('The identifier of the athlete. Must be the authenticated athlete. Example: 943379048')
});

const OutputSchema = ActivityStatsSchema;

const action = createAction({
    description: "Get an athlete's recent, year-to-date, and all-time ride/run/swim totals.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read', 'activity:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.strava.com/docs/reference/#api-Athletes-getStats
            endpoint: `/api/v3/athletes/${encodeURIComponent(input.athlete_id)}/stats`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Athlete stats not found',
                athlete_id: input.athlete_id
            });
        }

        const stats = ActivityStatsSchema.parse(response.data);
        return stats;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
