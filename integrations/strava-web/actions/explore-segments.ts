import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    bounds: z.string().describe('Bounding box in format lat1,lng1,lat2,lng2. Example: "37.76,-122.51,37.78,-122.45"'),
    activity_type: z.enum(['run', 'riding']).optional().describe('Optional activity type filter. Accepts run or riding.'),
    min_cat: z.number().optional().describe('Optional minimum climb category filter.'),
    max_cat: z.number().optional().describe('Optional maximum climb category filter.')
});

const ExplorerSegmentSchema = z.object({
    id: z.number(),
    resource_state: z.number().optional(),
    name: z.string().optional(),
    climb_category: z.number().optional(),
    climb_category_desc: z.string().optional(),
    avg_grade: z.number().optional(),
    start_latlng: z.array(z.number()).optional(),
    end_latlng: z.array(z.number()).optional(),
    elev_difference: z.number().optional(),
    distance: z.number().optional(),
    points: z.string().optional(),
    starred: z.boolean().optional()
});

const OutputSchema = z.object({
    segments: z.array(ExplorerSegmentSchema)
});

const action = createAction({
    description: 'Search for popular segments within a bounding box.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const activityType = input.activity_type === 'run' ? 'running' : input.activity_type;

        const response = await nango.get({
            // https://developers.strava.com/docs/reference/
            endpoint: '/api/v3/segments/explore',
            params: {
                bounds: input.bounds,
                ...(activityType !== undefined && { activity_type: activityType }),
                ...(input.min_cat !== undefined && { min_cat: input.min_cat }),
                ...(input.max_cat !== undefined && { max_cat: input.max_cat })
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                segments: z.array(z.unknown())
            })
            .parse(response.data);

        const segments = providerResponse.segments.map((segment) => ExplorerSegmentSchema.parse(segment));

        return {
            segments
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
