import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('The identifier of the segment to star. Example: 432873'),
    starred: z.boolean().describe('If true, star the segment; if false, unstar the segment.')
});

const SegmentSchema = z.object({
    id: z.number(),
    name: z.string(),
    activity_type: z.string().optional(),
    distance: z.number().optional(),
    average_grade: z.number().optional(),
    maximum_grade: z.number().optional(),
    elevation_high: z.number().optional(),
    elevation_low: z.number().optional(),
    start_latlng: z.tuple([z.number(), z.number()]).nullable().optional(),
    end_latlng: z.tuple([z.number(), z.number()]).nullable().optional(),
    climb_category: z.number().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    private: z.boolean().optional(),
    hazardous: z.boolean().optional(),
    starred: z.boolean().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    total_elevation_gain: z.number().optional(),
    effort_count: z.number().optional(),
    athlete_count: z.number().optional(),
    star_count: z.number().optional(),
    map: z
        .object({
            id: z.string().optional(),
            polyline: z.string().optional(),
            resource_state: z.number().optional()
        })
        .optional(),
    athlete_segment_stats: z
        .object({
            pr_elapsed_time: z.number().nullable().optional(),
            pr_date: z.string().nullable().optional(),
            effort_count: z.number().nullable().optional()
        })
        .nullable()
        .optional(),
    athlete_pr_effort: z
        .object({
            pr_elapsed_time: z.number().nullable().optional(),
            pr_date: z.string().nullable().optional(),
            effort_count: z.number().nullable().optional()
        })
        .nullable()
        .optional(),
    resource_state: z.number().optional()
});

const OutputSchema = SegmentSchema;

const action = createAction({
    description: 'Star or unstar a segment for the authenticated athlete.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['profile:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.strava.com/docs/reference/#api-Segments-starSegment
        const response = await nango.put({
            endpoint: `/api/v3/segments/${encodeURIComponent(String(input.id))}/starred`,
            params: {
                starred: String(input.starred)
            },
            retries: 3
        });

        const segment = SegmentSchema.parse(response.data);

        return segment;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
