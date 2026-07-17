import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('The identifier of the segment. Example: 432873')
});

const LatLngSchema = z.array(z.number()).min(2).max(2);

const PolylineMapSchema = z.object({
    id: z.string(),
    polyline: z.string().nullable().optional(),
    resource_state: z.number().optional(),
    summary_polyline: z.string().nullable().optional()
});

const ProviderSegmentSchema = z.object({
    id: z.number(),
    name: z.string(),
    activity_type: z.string().optional(),
    distance: z.number().optional(),
    average_grade: z.number().optional(),
    maximum_grade: z.number().optional(),
    elevation_high: z.number().optional(),
    elevation_low: z.number().optional(),
    start_latlng: LatLngSchema.nullable().optional(),
    end_latlng: LatLngSchema.nullable().optional(),
    climb_category: z.number().optional(),
    city: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    private: z.boolean().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    total_elevation_gain: z.number().optional(),
    map: PolylineMapSchema.nullable().optional(),
    effort_count: z.number().optional(),
    athlete_count: z.number().optional(),
    hazardous: z.boolean().optional(),
    star_count: z.number().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string(),
    activity_type: z.string().optional(),
    distance: z.number().optional(),
    average_grade: z.number().optional(),
    maximum_grade: z.number().optional(),
    elevation_high: z.number().optional(),
    elevation_low: z.number().optional(),
    start_latlng: LatLngSchema.nullable().optional(),
    end_latlng: LatLngSchema.nullable().optional(),
    climb_category: z.number().optional(),
    city: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    private: z.boolean().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    total_elevation_gain: z.number().optional(),
    map: PolylineMapSchema.nullable().optional(),
    effort_count: z.number().optional(),
    athlete_count: z.number().optional(),
    hazardous: z.boolean().optional(),
    star_count: z.number().optional()
});

const action = createAction({
    description: 'Retrieve a segment.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read', 'read_all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.strava.com/docs/reference/#api-Segments-getSegmentById
            endpoint: `/api/v3/segments/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Segment not found',
                id: input.id
            });
        }

        const providerSegment = ProviderSegmentSchema.parse(response.data);

        return {
            id: providerSegment.id,
            name: providerSegment.name,
            ...(providerSegment.activity_type !== undefined && { activity_type: providerSegment.activity_type }),
            ...(providerSegment.distance !== undefined && { distance: providerSegment.distance }),
            ...(providerSegment.average_grade !== undefined && { average_grade: providerSegment.average_grade }),
            ...(providerSegment.maximum_grade !== undefined && { maximum_grade: providerSegment.maximum_grade }),
            ...(providerSegment.elevation_high !== undefined && { elevation_high: providerSegment.elevation_high }),
            ...(providerSegment.elevation_low !== undefined && { elevation_low: providerSegment.elevation_low }),
            ...(providerSegment.start_latlng !== undefined && { start_latlng: providerSegment.start_latlng }),
            ...(providerSegment.end_latlng !== undefined && { end_latlng: providerSegment.end_latlng }),
            ...(providerSegment.climb_category !== undefined && { climb_category: providerSegment.climb_category }),
            ...(providerSegment.city !== undefined && { city: providerSegment.city }),
            ...(providerSegment.state !== undefined && { state: providerSegment.state }),
            ...(providerSegment.country !== undefined && { country: providerSegment.country }),
            ...(providerSegment.private !== undefined && { private: providerSegment.private }),
            ...(providerSegment.created_at !== undefined && { created_at: providerSegment.created_at }),
            ...(providerSegment.updated_at !== undefined && { updated_at: providerSegment.updated_at }),
            ...(providerSegment.total_elevation_gain !== undefined && { total_elevation_gain: providerSegment.total_elevation_gain }),
            ...(providerSegment.map !== undefined && { map: providerSegment.map }),
            ...(providerSegment.effort_count !== undefined && { effort_count: providerSegment.effort_count }),
            ...(providerSegment.athlete_count !== undefined && { athlete_count: providerSegment.athlete_count }),
            ...(providerSegment.hazardous !== undefined && { hazardous: providerSegment.hazardous }),
            ...(providerSegment.star_count !== undefined && { star_count: providerSegment.star_count })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
