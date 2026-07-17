import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    segment_id: z.number().int().describe('The identifier of the segment. Example: 432873'),
    start_date_local: z.string().optional().describe('ISO 8601 formatted date time. Filters efforts after this date.'),
    end_date_local: z.string().optional().describe('ISO 8601 formatted date time. Filters efforts before this date.'),
    per_page: z.number().int().min(1).max(200).optional().describe('Number of items per page. Defaults to 30.')
});

const SegmentEffortSchema = z
    .object({
        id: z.number(),
        resource_state: z.number().optional(),
        name: z.string().optional(),
        activity: z
            .object({
                id: z.number(),
                resource_state: z.number().optional()
            })
            .optional(),
        athlete: z
            .object({
                id: z.number(),
                resource_state: z.number().optional()
            })
            .optional(),
        elapsed_time: z.number().optional(),
        moving_time: z.number().optional(),
        start_date: z.string().optional(),
        start_date_local: z.string().optional(),
        distance: z.number().optional(),
        start_index: z.number().optional(),
        end_index: z.number().optional(),
        device_watts: z.boolean().optional(),
        average_watts: z.number().optional(),
        average_cadence: z.number().optional(),
        average_heartrate: z.number().optional(),
        max_heartrate: z.number().optional(),
        segment: z
            .object({
                id: z.number(),
                resource_state: z.number().optional(),
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
                starred: z.boolean().optional()
            })
            .passthrough()
            .optional(),
        kom_rank: z.number().nullable().optional(),
        pr_rank: z.number().nullable().optional(),
        achievements: z.array(z.unknown()).optional(),
        hidden: z.boolean().optional()
    })
    .passthrough();

const OutputSchema = z.array(SegmentEffortSchema);

const action = createAction({
    description: "List the authenticated athlete's efforts on a segment.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.strava.com/docs/reference/#api-Segments-getEffortsBySegmentId
            endpoint: '/api/v3/segment_efforts',
            params: {
                segment_id: input.segment_id,
                ...(input.start_date_local !== undefined && { start_date_local: input.start_date_local }),
                ...(input.end_date_local !== undefined && { end_date_local: input.end_date_local }),
                ...(input.per_page !== undefined && { per_page: input.per_page })
            },
            retries: 3
        });

        if (!Array.isArray(response.data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected an array of segment efforts from the Strava API.'
            });
        }

        return z.array(SegmentEffortSchema).parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
