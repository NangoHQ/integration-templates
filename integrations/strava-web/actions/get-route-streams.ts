import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    route_id: z.union([z.string(), z.number()]).describe('The identifier of the route. Example: "1"')
});

const StreamSchema = z.object({
    type: z.string(),
    data: z.array(z.union([z.number(), z.array(z.number())])).optional(),
    original_size: z.number().optional(),
    resolution: z.string().optional(),
    series_type: z.string().optional()
});

const OutputSchema = z.array(StreamSchema);

const action = createAction({
    description: 'Get the distance/altitude/latlng streams for a route.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read', 'read_all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.strava.com/docs/reference/#api-Streams-getRouteStreams
        const response = await nango.get({
            endpoint: `/api/v3/routes/${encodeURIComponent(input.route_id)}/streams`,
            retries: 3
        });

        if (!response.data || !Array.isArray(response.data)) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Route streams not found',
                route_id: input.route_id
            });
        }

        const streams = OutputSchema.parse(response.data);
        return streams;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
