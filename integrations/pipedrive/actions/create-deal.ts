import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    title: z.string().describe('The title of the deal. Example: "Deal of the century"'),
    value: z.number().optional().describe('The value of the deal. Example: 10000'),
    currency: z.string().optional().describe('The currency of the deal. Accepts a 3-character currency code. Example: "USD"'),
    user_id: z.number().optional().describe('The ID of the user which will be the owner of the created deal. Example: 123'),
    person_id: z.number().optional().describe('The ID of a person which this deal will be linked to. Example: 456'),
    org_id: z.number().optional().describe('The ID of an organization which this deal will be linked to. Example: 789'),
    pipeline_id: z.number().optional().describe('The ID of the pipeline this deal will be added to. Example: 1'),
    stage_id: z.number().optional().describe('The ID of the stage this deal will be added to. Example: 2'),
    status: z.enum(['open', 'won', 'lost']).optional().describe('The status of the deal. Values: open, won, lost'),
    expected_close_date: z.string().optional().describe('The expected close date of the deal. In ISO 8601 format: YYYY-MM-DD. Example: "2025-12-31"'),
    probability: z.number().optional().describe('The success probability percentage of the deal. Example: 60'),
    visible_to: z.number().optional().describe('The visibility of the deal. 1 = Owner only, 3 = Owner and followers, 5 = Entire company'),
    lost_reason: z.string().optional().describe('The reason for losing the deal. Only used when status is lost'),
    add_time: z.string().optional().describe('The optional creation date and time of the deal in UTC. Format: YYYY-MM-DD HH:MM:SS')
});

// https://developers.pipedrive.com/docs/api/v1/Deals#addDeal
// Helper to extract ID from either a number or an object with id property
const IdOrObjectSchema = z.union([z.number(), z.object({ id: z.number() }).transform((o) => o.id)]).nullable();

const ProviderDealSchema = z.object({
    id: z.number(),
    title: z.string(),
    value: z.number().nullable(),
    currency: z.string().nullable(),
    user_id: IdOrObjectSchema,
    person_id: IdOrObjectSchema,
    org_id: IdOrObjectSchema,
    pipeline_id: z.number().nullable(),
    stage_id: z.number().nullable(),
    status: z.string().nullable(),
    expected_close_date: z.string().nullable(),
    probability: z.number().nullable(),
    visible_to: z
        .union([z.number(), z.string()])
        .transform((v) => (typeof v === 'string' ? Number(v) : v))
        .nullable(),
    lost_reason: z.string().nullable(),
    add_time: z.string().nullable(),
    update_time: z.string().nullable()
});

const OutputSchema = z.object({
    id: z.number().describe('The ID of the created deal'),
    title: z.string().describe('The title of the deal'),
    value: z.number().optional().describe('The value of the deal'),
    currency: z.string().optional().describe('The currency of the deal'),
    user_id: z.number().optional().describe('The ID of the deal owner'),
    person_id: z.number().optional().describe('The ID of the linked person'),
    org_id: z.number().optional().describe('The ID of the linked organization'),
    pipeline_id: z.number().optional().describe('The ID of the pipeline'),
    stage_id: z.number().optional().describe('The ID of the stage'),
    status: z.string().optional().describe('The status of the deal'),
    expected_close_date: z.string().optional().describe('The expected close date'),
    probability: z.number().optional().describe('The success probability percentage'),
    visible_to: z.number().optional().describe('The visibility setting'),
    lost_reason: z.string().optional().describe('The reason for losing the deal'),
    add_time: z.string().optional().describe('The creation time of the deal'),
    update_time: z.string().optional().describe('The last update time of the deal')
});

const action = createAction({
    description: 'Create a deal in Pipedrive',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.pipedrive.com/docs/api/v1/Deals#addDeal
        const response = await nango.post({
            endpoint: '/v1/deals',
            data: {
                title: input.title,
                ...(input.value !== undefined && { value: input.value }),
                ...(input.currency !== undefined && { currency: input.currency }),
                ...(input.user_id !== undefined && { user_id: input.user_id }),
                ...(input.person_id !== undefined && { person_id: input.person_id }),
                ...(input.org_id !== undefined && { org_id: input.org_id }),
                ...(input.pipeline_id !== undefined && { pipeline_id: input.pipeline_id }),
                ...(input.stage_id !== undefined && { stage_id: input.stage_id }),
                ...(input.status !== undefined && { status: input.status }),
                ...(input.expected_close_date !== undefined && { expected_close_date: input.expected_close_date }),
                ...(input.probability !== undefined && { probability: input.probability }),
                ...(input.visible_to !== undefined && { visible_to: input.visible_to }),
                ...(input.lost_reason !== undefined && { lost_reason: input.lost_reason }),
                ...(input.add_time !== undefined && { add_time: input.add_time })
            },
            retries: 10
        });

        const dealData = ProviderDealSchema.parse(response.data?.data);

        return {
            id: dealData.id,
            title: dealData.title,
            ...(dealData.value != null && { value: dealData.value }),
            ...(dealData.currency != null && { currency: dealData.currency }),
            ...(dealData.user_id != null && { user_id: dealData.user_id }),
            ...(dealData.person_id != null && { person_id: dealData.person_id }),
            ...(dealData.org_id != null && { org_id: dealData.org_id }),
            ...(dealData.pipeline_id != null && { pipeline_id: dealData.pipeline_id }),
            ...(dealData.stage_id != null && { stage_id: dealData.stage_id }),
            ...(dealData.status != null && { status: dealData.status }),
            ...(dealData.expected_close_date != null && { expected_close_date: dealData.expected_close_date }),
            ...(dealData.probability != null && { probability: dealData.probability }),
            ...(dealData.visible_to != null && { visible_to: dealData.visible_to }),
            ...(dealData.lost_reason != null && { lost_reason: dealData.lost_reason }),
            ...(dealData.add_time != null && { add_time: dealData.add_time }),
            ...(dealData.update_time != null && { update_time: dealData.update_time })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
