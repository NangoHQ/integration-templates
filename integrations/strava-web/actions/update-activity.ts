import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Activity ID. Example: 19350154661'),
    name: z.string().optional(),
    type: z.string().optional(),
    sport_type: z.string().optional(),
    description: z.string().optional(),
    trainer: z.boolean().optional(),
    commute: z.boolean().optional(),
    gear_id: z.string().optional(),
    hide_from_home: z.boolean().optional()
});

const ProviderActivitySchema = z
    .object({
        id: z.number(),
        name: z.string().nullable().optional(),
        type: z.string().nullable().optional(),
        sport_type: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        trainer: z.boolean().nullable().optional(),
        commute: z.boolean().nullable().optional(),
        gear_id: z.string().nullable().optional(),
        hide_from_home: z.boolean().nullable().optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        id: z.number(),
        name: z.string().optional(),
        type: z.string().optional(),
        sport_type: z.string().optional(),
        description: z.string().optional(),
        trainer: z.boolean().optional(),
        commute: z.boolean().optional(),
        gear_id: z.string().optional(),
        hide_from_home: z.boolean().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Update an activity.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['activity:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body = new URLSearchParams();
        if (input.name !== undefined) {
            body.set('name', input.name);
        }
        if (input.type !== undefined) {
            body.set('type', input.type);
        }
        if (input.sport_type !== undefined) {
            body.set('sport_type', input.sport_type);
        }
        if (input.description !== undefined) {
            body.set('description', input.description);
        }
        if (input.trainer !== undefined) {
            body.set('trainer', String(input.trainer));
        }
        if (input.commute !== undefined) {
            body.set('commute', String(input.commute));
        }
        if (input.gear_id !== undefined) {
            body.set('gear_id', input.gear_id);
        }
        if (input.hide_from_home !== undefined) {
            body.set('hide_from_home', String(input.hide_from_home));
        }

        const response = await nango.put({
            // https://developers.strava.com/docs/reference/#api-Activities-updateActivityById
            endpoint: `/api/v3/activities/${encodeURIComponent(String(input.id))}`,
            data: body.toString(),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            retries: 1
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Activity not found or update failed',
                id: input.id
            });
        }

        const providerActivity = ProviderActivitySchema.parse(response.data);
        const { id, name, type, sport_type, description, trainer, commute, gear_id, hide_from_home, ...rest } = providerActivity;

        return {
            id,
            ...(name != null && { name }),
            ...(type != null && { type }),
            ...(sport_type != null && { sport_type }),
            ...(description != null && { description }),
            ...(trainer != null && { trainer }),
            ...(commute != null && { commute }),
            ...(gear_id != null && { gear_id }),
            ...(hide_from_home != null && { hide_from_home }),
            ...rest
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
