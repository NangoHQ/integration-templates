import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderStarredSegmentSchema = z.object({
    id: z.number(),
    resource_state: z.number().nullish(),
    name: z.string().nullish(),
    activity_type: z.string().nullish(),
    distance: z.number().nullish(),
    average_grade: z.number().nullish(),
    maximum_grade: z.number().nullish(),
    elevation_high: z.number().nullish(),
    elevation_low: z.number().nullish(),
    start_latlng: z.array(z.number()).nullish(),
    end_latlng: z.array(z.number()).nullish(),
    climb_category: z.number().nullish(),
    city: z.string().nullish(),
    state: z.string().nullish(),
    country: z.string().nullish(),
    private: z.boolean().nullish(),
    hazardous: z.boolean().nullish(),
    starred: z.boolean().nullish(),
    created_at: z.string().nullish(),
    updated_at: z.string().nullish(),
    total_elevation_gain: z.number().nullish(),
    map: z
        .object({
            id: z.string().nullish(),
            polyline: z.string().nullish(),
            resource_state: z.number().nullish()
        })
        .nullish(),
    effort_count: z.number().nullish(),
    athlete_count: z.number().nullish(),
    star_count: z.number().nullish(),
    athlete_segment_stats: z
        .object({
            pr_elapsed_time: z.number().nullish(),
            pr_date: z.string().nullish(),
            effort_count: z.number().nullish()
        })
        .nullish()
});

const StarredSegmentSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
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
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    total_elevation_gain: z.number().optional(),
    map: z
        .object({
            id: z.string().optional(),
            polyline: z.string().optional(),
            resource_state: z.number().optional()
        })
        .optional(),
    effort_count: z.number().optional(),
    athlete_count: z.number().optional(),
    star_count: z.number().optional(),
    athlete_segment_stats: z
        .object({
            pr_elapsed_time: z.number().optional(),
            pr_date: z.string().optional(),
            effort_count: z.number().optional()
        })
        .optional()
});

const sync = createSync({
    description: "Sync the authenticated athlete's starred segments.",
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        StarredSegment: StarredSegmentSchema
    },

    exec: async (nango) => {
        const toRecords = (batch: unknown) => {
            if (!Array.isArray(batch)) {
                throw new Error('Unexpected response: batch is not an array');
            }

            return batch.map((raw) => {
                const parsed = ProviderStarredSegmentSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse segment: ${parsed.error.message}`);
                }

                const segment = parsed.data;
                return {
                    id: String(segment.id),
                    ...(segment.name != null && { name: segment.name }),
                    ...(segment.activity_type != null && { activity_type: segment.activity_type }),
                    ...(segment.distance != null && { distance: segment.distance }),
                    ...(segment.average_grade != null && { average_grade: segment.average_grade }),
                    ...(segment.maximum_grade != null && { maximum_grade: segment.maximum_grade }),
                    ...(segment.elevation_high != null && { elevation_high: segment.elevation_high }),
                    ...(segment.elevation_low != null && { elevation_low: segment.elevation_low }),
                    ...(segment.start_latlng != null && { start_latlng: segment.start_latlng }),
                    ...(segment.end_latlng != null && { end_latlng: segment.end_latlng }),
                    ...(segment.climb_category != null && { climb_category: segment.climb_category }),
                    ...(segment.city != null && { city: segment.city }),
                    ...(segment.state != null && { state: segment.state }),
                    ...(segment.country != null && { country: segment.country }),
                    ...(segment.private != null && { private: segment.private }),
                    ...(segment.hazardous != null && { hazardous: segment.hazardous }),
                    ...(segment.starred != null && { starred: segment.starred }),
                    ...(segment.created_at != null && { created_at: segment.created_at }),
                    ...(segment.updated_at != null && { updated_at: segment.updated_at }),
                    ...(segment.total_elevation_gain != null && { total_elevation_gain: segment.total_elevation_gain }),
                    ...(segment.map != null && { map: segment.map }),
                    ...(segment.effort_count != null && { effort_count: segment.effort_count }),
                    ...(segment.athlete_count != null && { athlete_count: segment.athlete_count }),
                    ...(segment.star_count != null && { star_count: segment.star_count }),
                    ...(segment.athlete_segment_stats != null && { athlete_segment_stats: segment.athlete_segment_stats })
                };
            });
        };

        const proxyConfig: ProxyConfiguration = {
            // https://developers.strava.com/docs/reference/
            endpoint: '/api/v3/segments/starred',
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

        // Validate the first page before opening delete tracking, so a request or schema
        // failure on it doesn't leave tracking started with nothing ever saved or closed.
        const pages = nango.paginate(proxyConfig);
        const firstPage = await pages.next();
        const firstRecords = firstPage.done ? [] : toRecords(firstPage.value);

        await nango.trackDeletesStart('StarredSegment');

        if (firstRecords.length > 0) {
            await nango.batchSave(firstRecords, 'StarredSegment');
        }

        for await (const batch of pages) {
            const segments = toRecords(batch);
            if (segments.length > 0) {
                await nango.batchSave(segments, 'StarredSegment');
            }
        }

        await nango.trackDeletesEnd('StarredSegment');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
