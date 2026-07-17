import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().int().describe('The athlete ID. Must be the authenticated athlete. Example: 943379048'),
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page. Example: "1"'),
    per_page: z.number().int().min(1).max(200).optional().describe('Number of items per page. Maximum 200. Example: 30')
});

const RouteSchema = z
    .object({
        id: z.number().int(),
        id_str: z.string(),
        name: z.string(),
        description: z.string().optional().nullable(),
        distance: z.number(),
        elevation_gain: z.number(),
        type: z.number().int().optional(),
        sub_type: z.number().int().optional(),
        private: z.boolean().optional(),
        starred: z.boolean().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
        estimated_moving_time: z.number().int().optional(),
        segments: z.array(z.unknown()).optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(RouteSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List athlete routes.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor && /^\d+$/.test(input.cursor) ? parseInt(input.cursor, 10) : 1;
        const perPage = input.per_page ?? 30;

        const response = await nango.get({
            // https://developers.strava.com/docs/reference/#api-Routes-getRoutesByAthleteId
            endpoint: `/api/v3/athletes/${encodeURIComponent(String(input.id))}/routes`,
            params: {
                page: page,
                per_page: perPage
            },
            retries: 3
        });

        const routes = z.array(RouteSchema).parse(response.data);
        const nextCursor = routes.length === perPage ? String(page + 1) : undefined;

        return {
            items: routes,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
