import { z } from 'zod';
import type { ProxyConfiguration } from 'nango';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.'),
    per_page: z.number().optional().describe('Number of items per page. Defaults to 30.')
});

const SegmentMapSchema = z.object({
    id: z.string().optional(),
    polyline: z.string().optional(),
    resource_state: z.number().optional()
});

const AthleteSegmentStatsSchema = z.object({
    pr_elapsed_time: z.number().optional(),
    pr_date: z.string().optional(),
    effort_count: z.number().optional()
});

const AthletePREffortSchema = z.object({
    id: z.number().optional(),
    elapsed_time: z.number().optional(),
    distance: z.number().optional(),
    start_date: z.string().optional(),
    pr_rank: z.number().nullable().optional()
});

const SegmentSchema = z.object({
    id: z.number(),
    name: z.string(),
    resource_state: z.number().optional(),
    activity_type: z.string().optional(),
    distance: z.number().optional(),
    average_grade: z.number().optional(),
    maximum_grade: z.number().optional(),
    elevation_high: z.number().optional(),
    elevation_low: z.number().optional(),
    start_latlng: z.array(z.number()).optional(),
    end_latlng: z.array(z.number()).optional(),
    climb_category: z.number().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    private: z.boolean().optional(),
    hazardous: z.boolean().optional(),
    starred: z.boolean().optional(),
    starred_date: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    total_elevation_gain: z.number().optional(),
    map: SegmentMapSchema.optional(),
    effort_count: z.number().optional(),
    athlete_count: z.number().optional(),
    star_count: z.number().optional(),
    athlete_segment_stats: AthleteSegmentStatsSchema.optional(),
    athlete_pr_effort: AthletePREffortSchema.optional()
});

const OutputSchema = z.object({
    items: z.array(SegmentSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: "List the authenticated athlete's starred segments.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (Number.isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a positive integer page number'
            });
        }

        const perPage = input.per_page ?? 30;

        const config: ProxyConfiguration = {
            // https://developers.strava.com/docs/reference/
            endpoint: '/api/v3/segments/starred',
            params: {
                page: String(page),
                per_page: String(perPage)
            },
            retries: 3
        };

        const response = await nango.get(config);

        const rawSegments = z.array(z.unknown()).parse(response.data);
        const segments = rawSegments.map((segment) => SegmentSchema.parse(segment));

        const nextCursor = segments.length === perPage ? String(page + 1) : undefined;

        return {
            items: segments,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
