import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ZoneSchema = z.object({
    min: z.number(),
    max: z.number()
});

const HeartRateZonesSchema = z.object({
    custom_zones: z.boolean(),
    zones: z.array(ZoneSchema)
});

const OutputSchema = z.object({
    heart_rate: HeartRateZonesSchema,
    power: z
        .object({
            zones: z.array(ZoneSchema)
        })
        .optional()
});

const action = createAction({
    description: "Get the authenticated athlete's heart rate and power zones.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['profile:read_all'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.strava.com/docs/reference/
            endpoint: '/api/v3/athlete/zones',
            retries: 3
        });

        const data = OutputSchema.parse(response.data);

        return data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
