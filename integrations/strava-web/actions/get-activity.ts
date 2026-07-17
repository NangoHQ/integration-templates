import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Activity ID. Example: 19350154255'),
    include_all_efforts: z.boolean().optional().describe('Include all segment efforts in the response')
});

const OutputSchema = z
    .object({
        id: z.number(),
        name: z.string().optional(),
        distance: z.number().optional(),
        moving_time: z.number().optional(),
        elapsed_time: z.number().optional(),
        total_elevation_gain: z.number().optional(),
        type: z.string().optional(),
        sport_type: z.string().optional(),
        start_date: z.string().optional(),
        start_date_local: z.string().optional(),
        timezone: z.string().optional(),
        private: z.boolean().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve an activity',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['activity:read_all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.strava.com/docs/reference/#api-Activities-getActivityById
            endpoint: `/api/v3/activities/${encodeURIComponent(String(input.id))}`,
            params: {
                ...(input.include_all_efforts !== undefined && { include_all_efforts: String(input.include_all_efforts) })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Activity not found',
                id: input.id
            });
        }

        const activity = OutputSchema.parse(response.data);
        return activity;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
