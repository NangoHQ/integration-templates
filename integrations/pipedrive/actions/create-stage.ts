import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('The name of the stage. Example: "Qualified Lead"'),
    pipeline_id: z.number().describe('The ID of the pipeline to add the stage to. Example: 1'),
    deal_probability: z
        .number()
        .optional()
        .describe('The success probability percentage of the deal. Used/shown when deal weighted values are used. Example: 50'),
    is_deal_rot_enabled: z.boolean().optional().describe('Whether deals in this stage can become rotten'),
    days_to_rotten: z
        .number()
        .optional()
        .describe('The number of days the deals not updated in this stage would become rotten. Applies only if is_deal_rot_enabled is set.')
});

const ProviderStageSchema = z.object({
    id: z.number(),
    name: z.string(),
    pipeline_id: z.number(),
    order_nr: z.number().optional(),
    deal_probability: z.number().optional(),
    is_deal_rot_enabled: z.boolean().optional(),
    days_to_rotten: z.number().nullable().optional(),
    add_time: z.string().optional(),
    update_time: z.string().optional(),
    active_flag: z.boolean().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    pipeline_id: z.number(),
    order_nr: z.number().optional(),
    deal_probability: z.number().optional(),
    is_deal_rot_enabled: z.boolean().optional(),
    days_to_rotten: z.number().optional(),
    add_time: z.string().optional(),
    update_time: z.string().optional(),
    active_flag: z.boolean().optional()
});

const action = createAction({
    description: 'Create a stage in Pipedrive',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.pipedrive.com/docs/api/v1/Stages#addStage
            endpoint: '/v2/stages',
            data: {
                name: input.name,
                pipeline_id: input.pipeline_id,
                ...(input.deal_probability !== undefined && { deal_probability: input.deal_probability }),
                ...(input.is_deal_rot_enabled !== undefined && { is_deal_rot_enabled: input.is_deal_rot_enabled }),
                ...(input.days_to_rotten !== undefined && { days_to_rotten: input.days_to_rotten })
            },
            retries: 3
        });

        if (!response.data || !response.data.data) {
            throw new nango.ActionError({
                type: 'creation_failed',
                message: 'Failed to create stage',
                input: input
            });
        }

        const stage = ProviderStageSchema.parse(response.data.data);

        return {
            id: String(stage.id),
            name: stage.name,
            pipeline_id: stage.pipeline_id,
            ...(stage.order_nr !== undefined && { order_nr: stage.order_nr }),
            ...(stage.deal_probability !== undefined && { deal_probability: stage.deal_probability }),
            ...(stage.is_deal_rot_enabled !== undefined && { is_deal_rot_enabled: stage.is_deal_rot_enabled }),
            ...(stage.days_to_rotten !== undefined && stage.days_to_rotten !== null && { days_to_rotten: stage.days_to_rotten }),
            ...(stage.add_time !== undefined && { add_time: stage.add_time }),
            ...(stage.update_time !== undefined && { update_time: stage.update_time }),
            ...(stage.active_flag !== undefined && { active_flag: stage.active_flag })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
