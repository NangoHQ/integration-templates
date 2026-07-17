import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Activity name. Example: "Morning Run"'),
    sport_type: z.string().describe('Sport type. Example: "Run"'),
    start_date_local: z.string().describe('Start date in ISO 8601 format. Example: "2026-07-17T10:00:00Z"'),
    elapsed_time: z.number().int().describe('Elapsed time in seconds. Example: 3600'),
    type: z.string().optional().describe('Legacy sport type. Prefer sport_type.'),
    description: z.string().optional().describe('Activity description.'),
    distance: z.number().optional().describe('Distance in meters. Example: 10000'),
    trainer: z.number().int().min(0).max(1).optional().describe('Whether the activity was on a trainer. 0 or 1.'),
    commute: z.number().int().min(0).max(1).optional().describe('Whether the activity was a commute. 0 or 1.')
});

const OutputSchema = z
    .object({
        id: z.number().int(),
        name: z.string(),
        sport_type: z.string().nullish(),
        type: z.string().nullish(),
        start_date: z.string().nullish(),
        start_date_local: z.string().nullish(),
        elapsed_time: z.number().int().nullish(),
        moving_time: z.number().int().nullish(),
        distance: z.number().nullish(),
        description: z.string().nullish(),
        trainer: z.union([z.boolean(), z.number().int()]).nullish(),
        commute: z.union([z.boolean(), z.number().int()]).nullish()
    })
    .passthrough();

const action = createAction({
    description: 'Create a manual activity.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['activity:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params = new URLSearchParams();
        params.append('name', input.name);
        params.append('sport_type', input.sport_type);
        params.append('start_date_local', input.start_date_local);
        params.append('elapsed_time', String(input.elapsed_time));
        if (input.type !== undefined) {
            params.append('type', input.type);
        }
        if (input.description !== undefined) {
            params.append('description', input.description);
        }
        if (input.distance !== undefined) {
            params.append('distance', String(input.distance));
        }
        if (input.trainer !== undefined) {
            params.append('trainer', String(input.trainer));
        }
        if (input.commute !== undefined) {
            params.append('commute', String(input.commute));
        }

        const config: ProxyConfiguration = {
            // https://developers.strava.com/docs/reference/#api-Activities-createActivity
            endpoint: '/api/v3/activities',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: params.toString(),
            retries: 3
        };

        const response = await nango.post(config);

        const activity = OutputSchema.parse(response.data);
        return activity;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
