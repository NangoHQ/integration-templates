import { z } from 'zod';
import { createAction } from 'nango';

const MetaSchema = z.object({
    id: z.number(),
    resource_state: z.number().optional()
});

const ProviderLapSchema = z.object({
    id: z.number(),
    resource_state: z.number().optional(),
    name: z.string().nullable().optional(),
    activity: MetaSchema.nullable().optional(),
    athlete: MetaSchema.nullable().optional(),
    elapsed_time: z.number().nullable().optional(),
    moving_time: z.number().nullable().optional(),
    start_date: z.string().nullable().optional(),
    start_date_local: z.string().nullable().optional(),
    distance: z.number().nullable().optional(),
    start_index: z.number().nullable().optional(),
    end_index: z.number().nullable().optional(),
    total_elevation_gain: z.number().nullable().optional(),
    average_speed: z.number().nullable().optional(),
    max_speed: z.number().nullable().optional(),
    average_cadence: z.number().nullable().optional(),
    device_watts: z.boolean().nullable().optional(),
    average_watts: z.number().nullable().optional(),
    average_heartrate: z.number().nullable().optional(),
    max_heartrate: z.number().nullable().optional(),
    lap_index: z.number().nullable().optional(),
    split: z.number().nullable().optional()
});

const LapSchema = z.object({
    id: z.number(),
    resource_state: z.number().optional(),
    name: z.string().optional(),
    activity: MetaSchema.optional(),
    athlete: MetaSchema.optional(),
    elapsed_time: z.number().optional(),
    moving_time: z.number().optional(),
    start_date: z.string().optional(),
    start_date_local: z.string().optional(),
    distance: z.number().optional(),
    start_index: z.number().optional(),
    end_index: z.number().optional(),
    total_elevation_gain: z.number().optional(),
    average_speed: z.number().optional(),
    max_speed: z.number().optional(),
    average_cadence: z.number().optional(),
    device_watts: z.boolean().optional(),
    average_watts: z.number().optional(),
    average_heartrate: z.number().optional(),
    max_heartrate: z.number().optional(),
    lap_index: z.number().optional(),
    split: z.number().optional()
});

const InputSchema = z.object({
    activity_id: z.number().int().describe('The identifier of the activity. Example: 19350154255')
});

const OutputSchema = z.object({
    laps: z.array(LapSchema)
});

const action = createAction({
    description: 'List the laps of an activity.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['activity:read', 'activity:read_all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.strava.com/docs/reference/#api-Activities-getLapsByActivityId
            endpoint: `/api/v3/activities/${encodeURIComponent(String(input.activity_id))}/laps`,
            retries: 3
        });

        const providerLaps = z.array(ProviderLapSchema).parse(response.data);

        return {
            laps: providerLaps.map((lap) => ({
                id: lap.id,
                ...(lap.resource_state !== undefined && { resource_state: lap.resource_state }),
                ...(lap.name != null && { name: lap.name }),
                ...(lap.activity != null && { activity: lap.activity }),
                ...(lap.athlete != null && { athlete: lap.athlete }),
                ...(lap.elapsed_time != null && { elapsed_time: lap.elapsed_time }),
                ...(lap.moving_time != null && { moving_time: lap.moving_time }),
                ...(lap.start_date != null && { start_date: lap.start_date }),
                ...(lap.start_date_local != null && { start_date_local: lap.start_date_local }),
                ...(lap.distance != null && { distance: lap.distance }),
                ...(lap.start_index != null && { start_index: lap.start_index }),
                ...(lap.end_index != null && { end_index: lap.end_index }),
                ...(lap.total_elevation_gain != null && { total_elevation_gain: lap.total_elevation_gain }),
                ...(lap.average_speed != null && { average_speed: lap.average_speed }),
                ...(lap.max_speed != null && { max_speed: lap.max_speed }),
                ...(lap.average_cadence != null && { average_cadence: lap.average_cadence }),
                ...(lap.device_watts != null && { device_watts: lap.device_watts }),
                ...(lap.average_watts != null && { average_watts: lap.average_watts }),
                ...(lap.average_heartrate != null && { average_heartrate: lap.average_heartrate }),
                ...(lap.max_heartrate != null && { max_heartrate: lap.max_heartrate }),
                ...(lap.lap_index != null && { lap_index: lap.lap_index }),
                ...(lap.split != null && { split: lap.split })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
