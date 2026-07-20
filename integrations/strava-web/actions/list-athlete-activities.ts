import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.'),
    before: z.number().int().optional().describe('Seconds since UNIX epoch. Only return activities before this time.'),
    after: z.number().int().optional().describe('Seconds since UNIX epoch. Only return activities after this time.'),
    per_page: z.number().int().min(1).max(200).optional().describe('Number of items per page. Maximum 200.')
});

const MapSchema = z
    .object({
        id: z.string(),
        summary_polyline: z.string().nullable().optional(),
        resource_state: z.number()
    })
    .passthrough();

const ActivitySchema = z
    .object({
        id: z.number(),
        name: z.string(),
        distance: z.number(),
        moving_time: z.number(),
        elapsed_time: z.number(),
        total_elevation_gain: z.number(),
        type: z.string(),
        sport_type: z.string().nullable().optional(),
        workout_type: z.number().nullable().optional(),
        start_date: z.string(),
        start_date_local: z.string(),
        timezone: z.string().optional(),
        utc_offset: z.number().optional(),
        location_city: z.string().nullable().optional(),
        location_state: z.string().nullable().optional(),
        location_country: z.string().nullable().optional(),
        achievement_count: z.number().optional(),
        kudos_count: z.number().optional(),
        comment_count: z.number().optional(),
        athlete_count: z.number().optional(),
        photo_count: z.number().optional(),
        map: MapSchema.nullable().optional(),
        trainer: z.boolean().optional(),
        commute: z.boolean().optional(),
        manual: z.boolean().optional(),
        private: z.boolean().optional(),
        visibility: z.string().optional(),
        flagged: z.boolean().optional(),
        gear_id: z.string().nullable().optional(),
        start_latlng: z.array(z.number()).optional(),
        end_latlng: z.array(z.number()).optional(),
        average_speed: z.number().optional(),
        max_speed: z.number().optional(),
        has_heartrate: z.boolean().optional(),
        average_heartrate: z.number().nullable().optional(),
        max_heartrate: z.number().nullable().optional(),
        heartrate_opt_out: z.boolean().optional(),
        display_hide_heartrate_option: z.boolean().optional(),
        elev_high: z.number().nullable().optional(),
        elev_low: z.number().nullable().optional(),
        upload_id: z.number().nullable().optional(),
        upload_id_str: z.string().optional(),
        external_id: z.string().nullable().optional(),
        from_accepted_tag: z.boolean().optional(),
        pr_count: z.number().optional(),
        total_photo_count: z.number().optional(),
        has_kudoed: z.boolean().optional(),
        suffer_score: z.number().nullable().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(ActivitySchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List athlete activities.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['activity:read', 'activity:read_all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const currentPage = input.cursor !== undefined ? Number(input.cursor) : 1;
        if (input.cursor !== undefined && (!Number.isInteger(currentPage) || currentPage < 1)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a valid positive integer representing a page number'
            });
        }

        const perPage = input.per_page ?? 30;

        const config: ProxyConfiguration = {
            // https://developers.strava.com/docs/reference/#api-Activities-getLoggedInAthleteActivities
            endpoint: '/api/v3/athlete/activities',
            params: {
                page: currentPage,
                per_page: perPage,
                ...(input.before !== undefined && { before: input.before }),
                ...(input.after !== undefined && { after: input.after })
            },
            retries: 3
        };

        const response = await nango.get(config);

        if (!Array.isArray(response.data)) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Expected an array of activities from the Strava API'
            });
        }

        const activities = response.data.map((item: unknown) => ActivitySchema.parse(item));

        const hasNext = activities.length === perPage;

        return {
            items: activities,
            ...(hasNext && { next_cursor: String(currentPage + 1) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
