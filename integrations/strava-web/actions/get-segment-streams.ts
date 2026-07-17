import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('The identifier of the segment. Example: 432873'),
    keys: z.array(z.string()).optional().describe('The types of streams to return. Defaults to distance, altitude, and latlng.'),
    key_by_type: z.boolean().optional().describe('Must be true to return streams keyed by type. Defaults to true.')
});

const StreamSchema = z
    .object({
        data: z.array(z.unknown()),
        series_type: z.string(),
        original_size: z.number(),
        resolution: z.string()
    })
    .passthrough();

const OutputSchema = z.object({
    distance: StreamSchema.optional(),
    altitude: StreamSchema.optional(),
    latlng: StreamSchema.optional(),
    time: StreamSchema.optional(),
    velocity_smooth: StreamSchema.optional(),
    heartrate: StreamSchema.optional(),
    cadence: StreamSchema.optional(),
    watts: StreamSchema.optional()
});

const action = createAction({
    description: 'Get the distance/altitude/latlng streams for a segment.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read', 'read_all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const keys = input.keys ?? ['distance', 'altitude', 'latlng'];
        const keyByType = input.key_by_type ?? true;

        const response = await nango.get({
            // https://developers.strava.com/docs/reference/#api-Streams-getSegmentStreams
            endpoint: `/api/v3/segments/${encodeURIComponent(String(input.id))}/streams`,
            params: {
                keys: keys.join(','),
                key_by_type: String(keyByType)
            },
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object' || Array.isArray(response.data)) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Segment streams not found',
                id: input.id
            });
        }

        const ProviderStreamSetSchema = z
            .object({
                distance: StreamSchema.optional(),
                altitude: StreamSchema.optional(),
                latlng: StreamSchema.optional(),
                time: StreamSchema.optional(),
                velocity_smooth: StreamSchema.optional(),
                heartrate: StreamSchema.optional(),
                cadence: StreamSchema.optional(),
                watts: StreamSchema.optional()
            })
            .passthrough();

        const providerData = ProviderStreamSetSchema.parse(response.data);

        return {
            ...(providerData.distance !== undefined && { distance: providerData.distance }),
            ...(providerData.altitude !== undefined && { altitude: providerData.altitude }),
            ...(providerData.latlng !== undefined && { latlng: providerData.latlng }),
            ...(providerData.time !== undefined && { time: providerData.time }),
            ...(providerData.velocity_smooth !== undefined && { velocity_smooth: providerData.velocity_smooth }),
            ...(providerData.heartrate !== undefined && { heartrate: providerData.heartrate }),
            ...(providerData.cadence !== undefined && { cadence: providerData.cadence }),
            ...(providerData.watts !== undefined && { watts: providerData.watts })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
