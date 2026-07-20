import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const RouteSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    distance: z.number().optional(),
    elevation_gain: z.number().optional(),
    private: z.boolean().optional(),
    starred: z.boolean().optional(),
    type: z.number().optional(),
    sub_type: z.number().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    timestamp: z.number().optional(),
    map: z
        .object({
            id: z.string().optional(),
            polyline: z.string().optional(),
            summary_polyline: z.string().optional()
        })
        .optional()
});

const CheckpointSchema = z.object({
    page: z.number()
});

const sync = createSync({
    description: 'Sync routes.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Route: RouteSchema
    },

    exec: async (nango) => {
        await nango.getCheckpoint();

        // https://developers.strava.com/docs/reference/#api-Athletes-getLoggedInAthlete
        const athleteResponse = await nango.get({
            endpoint: '/api/v3/athlete',
            retries: 3
        });

        const athleteId = z
            .object({
                id: z.number().int()
            })
            .parse(athleteResponse.data).id;

        // Strava's /athletes/{id}/routes endpoint only supports page/per_page
        // pagination and does not expose updated_after or any incremental filter,
        // so we walk the full dataset each run. Delete tracking requires starting
        // from page 1 every run.
        let page = 1;

        await nango.trackDeletesStart('Route');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.strava.com/docs/reference/#api-Routes-getRoutesByAthleteId
            endpoint: `/api/v3/athletes/${encodeURIComponent(String(athleteId))}/routes`,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: page,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 30
            },
            retries: 3
        };

        for await (const routes of nango.paginate(proxyConfig)) {
            const validatedRoutes = z.array(z.unknown()).parse(routes);

            const records = validatedRoutes.map((rawRoute) => {
                const route = z
                    .object({
                        id: z.number().int(),
                        id_str: z.string().optional(),
                        name: z.string().optional(),
                        description: z.string().nullable().optional(),
                        distance: z.number().optional(),
                        elevation_gain: z.number().optional(),
                        private: z.boolean().optional(),
                        starred: z.boolean().optional(),
                        type: z.number().optional(),
                        sub_type: z.number().optional(),
                        created_at: z.string().optional(),
                        updated_at: z.string().optional(),
                        timestamp: z.number().optional(),
                        map: z
                            .object({
                                id: z.string().optional(),
                                polyline: z.string().nullable().optional(),
                                summary_polyline: z.string().nullable().optional()
                            })
                            .optional()
                    })
                    .parse(rawRoute);

                return {
                    id: String(route.id_str ?? route.id),
                    ...(route.name !== undefined && { name: route.name }),
                    ...(route.description != null && { description: route.description }),
                    ...(route.distance !== undefined && { distance: route.distance }),
                    ...(route.elevation_gain !== undefined && { elevation_gain: route.elevation_gain }),
                    ...(route.private !== undefined && { private: route.private }),
                    ...(route.starred !== undefined && { starred: route.starred }),
                    ...(route.type !== undefined && { type: route.type }),
                    ...(route.sub_type !== undefined && { sub_type: route.sub_type }),
                    ...(route.created_at !== undefined && { created_at: route.created_at }),
                    ...(route.updated_at !== undefined && { updated_at: route.updated_at }),
                    ...(route.timestamp !== undefined && { timestamp: route.timestamp }),
                    ...(route.map !== undefined && {
                        map: {
                            ...(route.map.id !== undefined && { id: route.map.id }),
                            ...(route.map.polyline != null && { polyline: route.map.polyline }),
                            ...(route.map.summary_polyline != null && { summary_polyline: route.map.summary_polyline })
                        }
                    })
                };
            });

            if (records.length > 0) {
                await nango.batchSave(records, 'Route');
            }

            await nango.saveCheckpoint({ page });
            page = page + 1;
        }

        await nango.trackDeletesEnd('Route');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
