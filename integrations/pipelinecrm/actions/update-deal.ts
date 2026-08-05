import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    deal_id: z.number().describe('The ID of the deal to update. Example: 55383278'),
    name: z.string().optional(),
    summary: z.string().optional(),
    user_id: z.number().optional(),
    status: z.number().optional(),
    expected_close_date: z.string().optional(),
    closed_time: z.string().optional(),
    is_archived: z.boolean().optional(),
    value: z.number().optional(),
    primary_contact_id: z.number().optional(),
    person_ids: z.array(z.number()).optional(),
    shared_user_ids: z.array(z.number()).optional(),
    company_id: z.number().optional(),
    company_name: z.string().optional(),
    probability: z.number().optional(),
    deal_stage_id: z.number().optional(),
    deal_loss_reason_id: z.number().optional(),
    deal_loss_reason_notes: z.string().optional(),
    deal_won_reason_id: z.number().optional(),
    deal_won_reason_notes: z.string().optional(),
    deal_source: z.number().optional(),
    custom_fields: z.record(z.string(), z.unknown()).optional(),
    tag_ids: z.array(z.number()).optional(),
    address_1: z.string().optional(),
    address_2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postal_code: z.string().optional(),
    country: z.string().optional()
});

const DealSchema = z
    .object({
        id: z.number(),
        name: z.string().nullable().optional(),
        summary: z.string().nullable().optional(),
        user_id: z.number().nullable().optional(),
        status: z.number().nullable().optional(),
        expected_close_date: z.string().nullable().optional(),
        closed_time: z.string().nullable().optional(),
        is_archived: z.boolean().nullable().optional(),
        value: z.union([z.number(), z.string()]).nullable().optional(),
        primary_contact_id: z.number().nullable().optional(),
        person_ids: z.array(z.number()).nullable().optional(),
        shared_user_ids: z.array(z.number()).nullable().optional(),
        company_id: z.number().nullable().optional(),
        company_name: z.string().nullable().optional(),
        probability: z.number().nullable().optional(),
        deal_stage_id: z.number().nullable().optional(),
        deal_loss_reason_id: z.number().nullable().optional(),
        deal_loss_reason_notes: z.string().nullable().optional(),
        deal_won_reason_id: z.number().nullable().optional(),
        deal_won_reason_notes: z.string().nullable().optional(),
        deal_source: z.number().nullable().optional(),
        custom_fields: z.record(z.string(), z.unknown()).nullable().optional(),
        tag_ids: z.array(z.number()).nullable().optional(),
        address_1: z.string().nullable().optional(),
        address_2: z.string().nullable().optional(),
        city: z.string().nullable().optional(),
        state: z.string().nullable().optional(),
        postal_code: z.string().nullable().optional(),
        country: z.string().nullable().optional(),
        created_at: z.string().nullable().optional(),
        updated_at: z.string().nullable().optional(),
        owner: z
            .object({
                id: z.number(),
                full_name: z.string()
            })
            .nullable()
            .optional(),
        company: z
            .object({
                id: z.number(),
                name: z.string()
            })
            .nullable()
            .optional(),
        deal_stage: z
            .object({
                id: z.number(),
                name: z.string()
            })
            .nullable()
            .optional(),
        tags: z
            .array(
                z.object({
                    id: z.number(),
                    name: z.string()
                })
            )
            .nullable()
            .optional()
    })
    .passthrough();

const action = createAction({
    description: 'Update fields on an existing deal.',
    version: '1.0.0',
    input: InputSchema,
    output: DealSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof DealSchema>> => {
        const dealPayload: Record<string, unknown> = {};
        if (input.name !== undefined) dealPayload['name'] = input.name;
        if (input.summary !== undefined) dealPayload['summary'] = input.summary;
        if (input.user_id !== undefined) dealPayload['user_id'] = input.user_id;
        if (input.status !== undefined) dealPayload['status'] = input.status;
        if (input.expected_close_date !== undefined) dealPayload['expected_close_date'] = input.expected_close_date;
        if (input.closed_time !== undefined) dealPayload['closed_time'] = input.closed_time;
        if (input.is_archived !== undefined) dealPayload['is_archived'] = input.is_archived;
        if (input.value !== undefined) dealPayload['value'] = input.value;
        if (input.primary_contact_id !== undefined) dealPayload['primary_contact_id'] = input.primary_contact_id;
        if (input.person_ids !== undefined) dealPayload['person_ids'] = input.person_ids;
        if (input.shared_user_ids !== undefined) dealPayload['shared_user_ids'] = input.shared_user_ids;
        if (input.company_id !== undefined) dealPayload['company_id'] = input.company_id;
        if (input.company_name !== undefined) dealPayload['company_name'] = input.company_name;
        if (input.probability !== undefined) dealPayload['probability'] = input.probability;
        if (input.deal_stage_id !== undefined) dealPayload['deal_stage_id'] = input.deal_stage_id;
        if (input.deal_loss_reason_id !== undefined) dealPayload['deal_loss_reason_id'] = input.deal_loss_reason_id;
        if (input.deal_loss_reason_notes !== undefined) dealPayload['deal_loss_reason_notes'] = input.deal_loss_reason_notes;
        if (input.deal_won_reason_id !== undefined) dealPayload['deal_won_reason_id'] = input.deal_won_reason_id;
        if (input.deal_won_reason_notes !== undefined) dealPayload['deal_won_reason_notes'] = input.deal_won_reason_notes;
        if (input.deal_source !== undefined) dealPayload['deal_source'] = input.deal_source;
        if (input.custom_fields !== undefined) dealPayload['custom_fields'] = input.custom_fields;
        if (input.tag_ids !== undefined) dealPayload['tag_ids'] = input.tag_ids;
        if (input.address_1 !== undefined) dealPayload['address_1'] = input.address_1;
        if (input.address_2 !== undefined) dealPayload['address_2'] = input.address_2;
        if (input.city !== undefined) dealPayload['city'] = input.city;
        if (input.state !== undefined) dealPayload['state'] = input.state;
        if (input.postal_code !== undefined) dealPayload['postal_code'] = input.postal_code;
        if (input.country !== undefined) dealPayload['country'] = input.country;

        const response = await nango.put({
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: `api/v3/deals/${encodeURIComponent(String(input.deal_id))}`,
            data: {
                deal: dealPayload
            },
            retries: 3
        });

        const deal = DealSchema.parse(response.data);
        return deal;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
