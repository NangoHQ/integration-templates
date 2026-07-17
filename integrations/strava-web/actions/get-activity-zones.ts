import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    activity_id: z.number().describe('Activity ID. Example: 19350154255')
});

const DistributionBucketSchema = z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    time: z.number().optional()
});

const ZoneSchema = z
    .object({
        score: z.number().optional(),
        distribution_buckets: z.array(DistributionBucketSchema).optional(),
        type: z.string().optional(),
        sensor_based: z.boolean().optional(),
        points: z.number().optional(),
        custom_zones: z.boolean().optional(),
        max: z.number().optional(),
        min: z.number().optional()
    })
    .passthrough();

const OutputSchema = z.array(ZoneSchema);

const action = createAction({
    description: "Get an activity's heart rate and power zone distribution.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['activity:read_all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.strava.com/docs/reference/
            endpoint: `/api/v3/activities/${encodeURIComponent(input.activity_id)}/zones`,
            retries: 3
        });

        const zones = OutputSchema.parse(response.data);
        return zones;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
