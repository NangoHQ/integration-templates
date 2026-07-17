import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.union([z.string(), z.number()]).describe('Route ID. Example: 1')
});

const ProviderMapSchema = z.object({
    id: z.string(),
    polyline: z.string().nullable().optional(),
    summary_polyline: z.string().nullable().optional()
});

const ProviderRouteSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable().optional(),
    distance: z.number(),
    elevation_gain: z.number(),
    map: ProviderMapSchema.optional(),
    type: z.number().optional(),
    sub_type: z.number().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    estimated_moving_time: z.number().optional(),
    private: z.boolean().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().optional(),
    distance: z.number(),
    elevation_gain: z.number(),
    map: z
        .object({
            id: z.string(),
            polyline: z.string().optional(),
            summary_polyline: z.string().optional()
        })
        .optional(),
    type: z.number().optional(),
    sub_type: z.number().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    estimated_moving_time: z.number().optional(),
    private: z.boolean().optional()
});

const action = createAction({
    description: 'Retrieve a route.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.strava.com/docs/reference/#api-Routes-getRouteById
            endpoint: `/api/v3/routes/${encodeURIComponent(String(input.id))}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Route not found',
                id: input.id
            });
        }

        const providerRoute = ProviderRouteSchema.parse(response.data);

        return {
            id: providerRoute.id,
            name: providerRoute.name,
            distance: providerRoute.distance,
            elevation_gain: providerRoute.elevation_gain,
            ...(providerRoute.description != null && { description: providerRoute.description }),
            ...(providerRoute.map !== undefined && {
                map: {
                    id: providerRoute.map.id,
                    ...(providerRoute.map.polyline != null && { polyline: providerRoute.map.polyline }),
                    ...(providerRoute.map.summary_polyline != null && { summary_polyline: providerRoute.map.summary_polyline })
                }
            }),
            ...(providerRoute.type !== undefined && { type: providerRoute.type }),
            ...(providerRoute.sub_type !== undefined && { sub_type: providerRoute.sub_type }),
            ...(providerRoute.created_at !== undefined && { created_at: providerRoute.created_at }),
            ...(providerRoute.updated_at !== undefined && { updated_at: providerRoute.updated_at }),
            ...(providerRoute.estimated_moving_time !== undefined && { estimated_moving_time: providerRoute.estimated_moving_time }),
            ...(providerRoute.private !== undefined && { private: providerRoute.private })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
