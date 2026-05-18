import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('The ID of the stage. Example: 1')
});

const ProviderStageSchema = z.object({
    id: z.number(),
    order_nr: z.number(),
    name: z.string(),
    active_flag: z.boolean(),
    deal_probability: z.number().nullable().optional(),
    pipeline_id: z.number(),
    rotten_flag: z.union([z.number(), z.boolean()]).nullable().optional(),
    rotten_days: z.number().nullable().optional(),
    add_time: z.string().nullable().optional(),
    update_time: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    order_nr: z.number(),
    name: z.string(),
    active_flag: z.boolean(),
    deal_probability: z.number().optional(),
    pipeline_id: z.number(),
    rotten_flag: z.union([z.number(), z.boolean()]).optional(),
    rotten_days: z.number().optional(),
    add_time: z.string().optional(),
    update_time: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single stage from Pipedrive.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-stage',
        group: 'Stages'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.pipedrive.com/docs/api/v1/Stages#getStage
            endpoint: `/v1/stages/${input.id}`,
            retries: 3
        });

        // Pipedrive API returns { success: boolean, data: Stage }
        const responseData = z
            .object({
                success: z.boolean(),
                data: ProviderStageSchema
            })
            .parse(response.data);

        if (!responseData.success || !responseData.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Stage not found',
                stage_id: input.id
            });
        }

        const stage = responseData.data;

        return {
            id: stage.id,
            order_nr: stage.order_nr,
            name: stage.name,
            active_flag: stage.active_flag,
            pipeline_id: stage.pipeline_id,
            ...(stage.deal_probability != null && { deal_probability: stage.deal_probability }),
            ...(stage.rotten_flag != null && { rotten_flag: stage.rotten_flag }),
            ...(stage.rotten_days != null && { rotten_days: stage.rotten_days }),
            ...(stage.add_time != null && { add_time: stage.add_time }),
            ...(stage.update_time != null && { update_time: stage.update_time })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
