import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('The ID of the deal to update. Example: 123'),
    title: z.string().optional().describe('The title of the deal'),
    owner_id: z.number().optional().describe('The ID of the user who owns the deal'),
    person_id: z.number().optional().describe('The ID of the person linked to the deal'),
    org_id: z.number().optional().describe('The ID of the organization linked to the deal'),
    pipeline_id: z.number().optional().describe('The ID of the pipeline associated with the deal'),
    stage_id: z.number().optional().describe('The ID of the deal stage'),
    value: z.number().optional().describe('The value of the deal'),
    currency: z.string().optional().describe('The currency associated with the deal (e.g., USD, EUR)'),
    status: z.enum(['open', 'won', 'lost']).optional().describe('The status of the deal'),
    probability: z.number().optional().describe('The success probability percentage of the deal'),
    lost_reason: z.string().optional().describe('The reason for losing the deal. Can only be set if deal status is lost'),
    expected_close_date: z.string().optional().describe('The expected close date of the deal in YYYY-MM-DD format'),
    visible_to: z.number().optional().describe('The visibility of the deal'),
    label_ids: z.array(z.number()).optional().describe('The IDs of labels assigned to the deal'),
    is_archived: z.boolean().optional().describe('Whether the deal is archived or not'),
    archive_time: z.string().optional().describe('The optional date and time of archiving the deal in UTC. Format: YYYY-MM-DD HH:MM:SS')
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractId(value: any): number | null | undefined {
    if (value === null) return null;
    if (value === undefined) return undefined;
    if (typeof value === 'number') return value;
    if (typeof value === 'object' && value.id !== undefined) {
        return typeof value.id === 'number' ? value.id : parseInt(value.id, 10);
    }
    return undefined;
}

const ProviderDealSchema = z.object({
    id: z.number(),
    title: z.string(),
    owner_id: z.number().optional(),
    person_id: z.unknown().optional().transform(extractId),
    org_id: z.unknown().optional().transform(extractId),
    pipeline_id: z.number().optional(),
    stage_id: z.number().optional(),
    value: z.number().optional(),
    currency: z.string().optional(),
    status: z.string().optional(),
    probability: z.number().optional(),
    lost_reason: z.string().nullable().optional(),
    expected_close_date: z.string().nullable().optional(),
    visible_to: z.union([z.number(), z.string().transform((v) => parseInt(v, 10))]).optional(),
    add_time: z.string().optional(),
    update_time: z.string().optional()
});

const OutputSchema = z.object({
    id: z.number().describe('The ID of the updated deal'),
    title: z.string().describe('The title of the deal'),
    owner_id: z.number().optional().describe('The ID of the user who owns the deal'),
    person_id: z.number().optional().describe('The ID of the person linked to the deal'),
    org_id: z.number().optional().describe('The ID of the organization linked to the deal'),
    pipeline_id: z.number().optional().describe('The ID of the pipeline associated with the deal'),
    stage_id: z.number().optional().describe('The ID of the deal stage'),
    value: z.number().optional().describe('The value of the deal'),
    currency: z.string().optional().describe('The currency associated with the deal'),
    status: z.string().optional().describe('The status of the deal'),
    probability: z.number().optional().describe('The success probability percentage of the deal'),
    lost_reason: z.string().optional().describe('The reason for losing the deal'),
    expected_close_date: z.string().optional().describe('The expected close date of the deal'),
    visible_to: z.number().optional().describe('The visibility of the deal'),
    add_time: z.string().optional().describe('The date and time when the deal was added'),
    update_time: z.string().optional().describe('The date and time when the deal was last updated')
});

const action = createAction({
    description: 'Update a deal in Pipedrive',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-deal',
        group: 'Deals'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Build the update payload, only including fields that are provided
        const updateData: Record<string, unknown> = {};

        if (input.title !== undefined) updateData['title'] = input.title;
        if (input.owner_id !== undefined) updateData['owner_id'] = input.owner_id;
        if (input.person_id !== undefined) updateData['person_id'] = input.person_id;
        if (input.org_id !== undefined) updateData['org_id'] = input.org_id;
        if (input.pipeline_id !== undefined) updateData['pipeline_id'] = input.pipeline_id;
        if (input.stage_id !== undefined) updateData['stage_id'] = input.stage_id;
        if (input.value !== undefined) updateData['value'] = input.value;
        if (input.currency !== undefined) updateData['currency'] = input.currency;
        if (input.status !== undefined) updateData['status'] = input.status;
        if (input.probability !== undefined) updateData['probability'] = input.probability;
        if (input.lost_reason !== undefined) updateData['lost_reason'] = input.lost_reason;
        if (input.expected_close_date !== undefined) updateData['expected_close_date'] = input.expected_close_date;
        if (input.visible_to !== undefined) updateData['visible_to'] = input.visible_to;
        if (input.label_ids !== undefined) updateData['label_ids'] = input.label_ids;
        if (input.is_archived !== undefined) updateData['is_archived'] = input.is_archived;
        if (input.archive_time !== undefined) updateData['archive_time'] = input.archive_time;

        // https://developers.pipedrive.com/docs/api/v1/Deals#updateDeal
        const response = await nango.put({
            endpoint: `/v1/deals/${input.id}`,
            data: updateData,
            retries: 3
        });

        const PipedriveResponseSchema = z.object({
            success: z.boolean(),
            data: z.unknown()
        });

        const parsedResponse = PipedriveResponseSchema.safeParse(response.data);

        if (!parsedResponse.success || !parsedResponse.data.success || !parsedResponse.data.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Deal not found or update failed',
                deal_id: input.id
            });
        }

        const dealData = ProviderDealSchema.parse(parsedResponse.data.data);

        return {
            id: dealData.id,
            title: dealData.title,
            ...(dealData.owner_id !== undefined && { owner_id: dealData.owner_id }),
            ...(dealData.person_id != null && { person_id: dealData.person_id }),
            ...(dealData.org_id != null && { org_id: dealData.org_id }),
            ...(dealData.pipeline_id !== undefined && { pipeline_id: dealData.pipeline_id }),
            ...(dealData.stage_id !== undefined && { stage_id: dealData.stage_id }),
            ...(dealData.value !== undefined && { value: dealData.value }),
            ...(dealData.currency !== undefined && { currency: dealData.currency }),
            ...(dealData.status !== undefined && { status: dealData.status }),
            ...(dealData.probability !== undefined && { probability: dealData.probability }),
            ...(dealData.lost_reason != null && { lost_reason: dealData.lost_reason }),
            ...(dealData.expected_close_date != null && { expected_close_date: dealData.expected_close_date }),
            ...(dealData.visible_to !== undefined && { visible_to: dealData.visible_to }),
            ...(dealData.add_time !== undefined && { add_time: dealData.add_time }),
            ...(dealData.update_time !== undefined && { update_time: dealData.update_time })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
