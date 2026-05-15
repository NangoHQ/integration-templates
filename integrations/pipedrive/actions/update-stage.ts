import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    stage_id: z.number().describe('The ID of the stage to update. Example: 1'),
    name: z.string().optional().describe('The name of the stage. Example: "Qualified Lead"'),
    pipeline_id: z.number().optional().describe('The ID of the pipeline the stage belongs to. Example: 1'),
    deal_probability: z
        .number()
        .optional()
        .describe('The success probability percentage of the deal. Used/shown when deal weighted values are used. Example: 50'),
    is_deal_rot_enabled: z.boolean().optional().describe('Whether deals in this stage can become rotten.'),
    days_to_rotten: z
        .number()
        .optional()
        .describe('The number of days the deals not updated in this stage would become rotten. Applies only if the is_deal_rot_enabled is set. Example: 30')
});

const ProviderStageSchema = z.object({
    id: z.number(),
    name: z.string(),
    pipeline_id: z.number(),
    order_nr: z.number(),
    deal_probability: z.number().nullable(),
    active_flag: z.boolean().optional(),
    rotten_flag: z.boolean().optional(),
    rotten_days: z.number().nullable().optional(),
    add_time: z.string().nullable(),
    update_time: z.string().nullable(),
    pipeline_name: z.string().optional(),
    pipeline_deal_probability: z.boolean().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string(),
    pipeline_id: z.number(),
    order_nr: z.number(),
    deal_probability: z.number().optional(),
    active_flag: z.boolean().optional(),
    rotten_flag: z.boolean().optional(),
    rotten_days: z.number().optional(),
    add_time: z.string().optional(),
    update_time: z.string().optional(),
    pipeline_name: z.string().optional(),
    pipeline_deal_probability: z.boolean().optional()
});

interface UpdatePayload {
    name?: string;
    pipeline_id?: number;
    deal_probability?: number;
    is_deal_rot_enabled?: boolean;
    days_to_rotten?: number;
}

const action = createAction({
    description: 'Update a stage in Pipedrive',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-stage',
        group: 'Stages'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['deals:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const payload: UpdatePayload = {};

        if (input.name !== undefined) {
            payload.name = input.name;
        }
        if (input.pipeline_id !== undefined) {
            payload.pipeline_id = input.pipeline_id;
        }
        if (input.deal_probability !== undefined) {
            payload.deal_probability = input.deal_probability;
        }
        if (input.is_deal_rot_enabled !== undefined) {
            payload.is_deal_rot_enabled = input.is_deal_rot_enabled;
        }
        if (input.days_to_rotten !== undefined) {
            payload.days_to_rotten = input.days_to_rotten;
        }

        // https://developers.pipedrive.com/docs/api/v1/Stages#updateStage
        const response = await nango.patch({
            endpoint: `/v2/stages/${input.stage_id}`,
            data: payload,
            retries: 3
        });

        if (!response.data || !response.data.success) {
            throw new nango.ActionError({
                type: 'update_failed',
                message: 'Failed to update stage'
            });
        }

        const providerData = ProviderStageSchema.parse(response.data.data);

        return {
            id: providerData.id,
            name: providerData.name,
            pipeline_id: providerData.pipeline_id,
            order_nr: providerData.order_nr,
            ...(providerData.deal_probability != null && { deal_probability: providerData.deal_probability }),
            ...(providerData.active_flag != null && { active_flag: providerData.active_flag }),
            ...(providerData.rotten_flag != null && { rotten_flag: providerData.rotten_flag }),
            ...(providerData.rotten_days != null && { rotten_days: providerData.rotten_days }),
            ...(providerData.add_time != null && { add_time: providerData.add_time }),
            ...(providerData.update_time != null && { update_time: providerData.update_time }),
            ...(providerData.pipeline_name != null && { pipeline_name: providerData.pipeline_name }),
            ...(providerData.pipeline_deal_probability != null && { pipeline_deal_probability: providerData.pipeline_deal_probability })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
