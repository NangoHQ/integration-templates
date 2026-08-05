import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Name of the deal. Example: "Acme Proposal"'),
    company_id: z.number().optional().describe('ID of the company to associate with this deal. Example: 138551860'),
    primary_contact_id: z.number().optional().describe('ID of the primary contact person for this deal. Example: 1309859835'),
    value: z.number().optional().describe('Monetary value of the deal. Example: 1255.23'),
    deal_pipeline_id: z.number().optional().describe('ID of the deal pipeline. Example: 339554'),
    deal_stage_id: z.number().optional().describe('ID of the deal stage. Not auto-assigned if omitted. Example: 2599196'),
    summary: z.string().optional().describe('Explanatory text about the deal.'),
    user_id: z.number().optional().describe('ID of the user who owns this deal. Example: 843757'),
    expected_close_date: z.string().optional().describe('Expected close date in YYYY-MM-DD format. Example: 2026-08-15'),
    closed_time: z.string().optional().describe('Actual close date in YYYY-MM-DD format. Example: 2026-08-10'),
    probability: z.number().optional().describe('Probability of closing (0-100). Setting 0 or 100 closes the deal.'),
    status: z.number().optional().describe('ID of the deal status. Example: 1'),
    deal_loss_reason_id: z.number().optional().describe('ID of the deal loss reason.'),
    deal_loss_reason_notes: z.string().optional().describe('Notes explaining why the deal was lost.'),
    deal_won_reason_id: z.number().optional().describe('ID of the deal won reason.'),
    deal_won_reason_notes: z.string().optional().describe('Notes explaining why the deal was won.'),
    deal_source: z.number().optional().describe('ID of the lead source for this deal.'),
    custom_fields: z.record(z.string(), z.unknown()).optional().describe('Custom fields object, e.g. { custom_label_90: [45, 46] }.'),
    tag_ids: z.array(z.number()).optional().describe('IDs of tags to attach to this deal.'),
    person_ids: z.array(z.number()).optional().describe('IDs of people to associate with this deal.'),
    shared_user_ids: z.array(z.number()).optional().describe('IDs of users to share this deal with (collaborators).'),
    address_1: z.string().optional().describe('First line of the deal address.'),
    address_2: z.string().optional().describe('Second line of the deal address.'),
    city: z.string().optional().describe('City of the deal address.'),
    state: z.string().optional().describe('State of the deal address.'),
    postal_code: z.string().optional().describe('Postal code of the deal address.'),
    country: z.string().optional().describe('Country of the deal address.'),
    is_archived: z.boolean().optional().describe('Whether the deal is archived.'),
    deliver_assignment_email: z.boolean().optional().describe('If true and assigning to a different user, send an assignment email.')
});

const ProviderDealSchema = z.object({
    id: z.number(),
    name: z.string().nullable(),
    summary: z.string().nullable(),
    user_id: z.number().nullable(),
    created_at: z.string().nullable(),
    updated_at: z.string().nullable(),
    is_archived: z.boolean().nullable(),
    primary_contact_id: z.number().nullable(),
    company_id: z.number().nullable(),
    deal_stage_id: z.number().nullable(),
    deal_pipeline_id: z.number().nullable(),
    status: z.number().nullable(),
    probability: z.number().nullable(),
    value: z.string().nullable(),
    expected_close_date: z.string().nullable(),
    closed_time: z.string().nullable(),
    deal_loss_reason_id: z.number().nullable(),
    deal_loss_reason_notes: z.string().nullable(),
    deal_won_reason_id: z.number().nullable(),
    deal_won_reason_notes: z.string().nullable(),
    source_id: z.number().nullable(),
    custom_fields: z.record(z.string(), z.unknown()).nullable(),
    tag_ids: z.array(z.number()).nullable(),
    person_ids: z.array(z.number()).nullable(),
    shared_user_ids: z.array(z.number()).nullable(),
    address_1: z.string().nullable(),
    address_2: z.string().nullable(),
    city: z.string().nullable(),
    state: z.string().nullable(),
    postal_code: z.string().nullable(),
    country: z.string().nullable(),
    revenue_type_id: z.number().nullable(),
    import_id: z.number().nullable(),
    next_entry_name: z.string().nullish(),
    next_entry_id: z.number().nullish(),
    next_entry_due: z.string().nullish(),
    next_entry_all_day: z.boolean().nullish()
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    summary: z.string().optional(),
    user_id: z.number().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    is_archived: z.boolean().optional(),
    primary_contact_id: z.number().optional(),
    company_id: z.number().optional(),
    deal_stage_id: z.number().optional(),
    deal_pipeline_id: z.number().optional(),
    status: z.number().optional(),
    probability: z.number().optional(),
    value: z.string().optional(),
    expected_close_date: z.string().optional(),
    closed_time: z.string().optional(),
    deal_loss_reason_id: z.number().optional(),
    deal_loss_reason_notes: z.string().optional(),
    deal_won_reason_id: z.number().optional(),
    deal_won_reason_notes: z.string().optional(),
    source_id: z.number().optional(),
    custom_fields: z.record(z.string(), z.unknown()).optional(),
    tag_ids: z.array(z.number()).optional(),
    person_ids: z.array(z.number()).optional(),
    shared_user_ids: z.array(z.number()).optional(),
    address_1: z.string().optional(),
    address_2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postal_code: z.string().optional(),
    country: z.string().optional(),
    revenue_type_id: z.number().optional(),
    import_id: z.number().optional(),
    next_entry_name: z.string().optional(),
    next_entry_id: z.number().optional(),
    next_entry_due: z.string().optional(),
    next_entry_all_day: z.boolean().optional()
});

const action = createAction({
    description: 'Create a new deal.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const dealPayload: Record<string, unknown> = {
            name: input.name
        };

        if (input.company_id !== undefined) {
            dealPayload['company_id'] = input.company_id;
        }
        if (input.primary_contact_id !== undefined) {
            dealPayload['primary_contact_id'] = input.primary_contact_id;
        }
        if (input.value !== undefined) {
            dealPayload['value'] = input.value;
        }
        if (input.deal_pipeline_id !== undefined) {
            dealPayload['deal_pipeline_id'] = input.deal_pipeline_id;
        }
        if (input.deal_stage_id !== undefined) {
            dealPayload['deal_stage_id'] = input.deal_stage_id;
        }
        if (input.summary !== undefined) {
            dealPayload['summary'] = input.summary;
        }
        if (input.user_id !== undefined) {
            dealPayload['user_id'] = input.user_id;
        }
        if (input.expected_close_date !== undefined) {
            dealPayload['expected_close_date'] = input.expected_close_date;
        }
        if (input.closed_time !== undefined) {
            dealPayload['closed_time'] = input.closed_time;
        }
        if (input.probability !== undefined) {
            dealPayload['probability'] = input.probability;
        }
        if (input.status !== undefined) {
            dealPayload['status'] = input.status;
        }
        if (input.deal_loss_reason_id !== undefined) {
            dealPayload['deal_loss_reason_id'] = input.deal_loss_reason_id;
        }
        if (input.deal_loss_reason_notes !== undefined) {
            dealPayload['deal_loss_reason_notes'] = input.deal_loss_reason_notes;
        }
        if (input.deal_won_reason_id !== undefined) {
            dealPayload['deal_won_reason_id'] = input.deal_won_reason_id;
        }
        if (input.deal_won_reason_notes !== undefined) {
            dealPayload['deal_won_reason_notes'] = input.deal_won_reason_notes;
        }
        if (input.deal_source !== undefined) {
            dealPayload['deal_source'] = input.deal_source;
        }
        if (input.custom_fields !== undefined) {
            dealPayload['custom_fields'] = input.custom_fields;
        }
        if (input.tag_ids !== undefined) {
            dealPayload['tag_ids'] = input.tag_ids;
        }
        if (input.person_ids !== undefined) {
            dealPayload['person_ids'] = input.person_ids;
        }
        if (input.shared_user_ids !== undefined) {
            dealPayload['shared_user_ids'] = input.shared_user_ids;
        }
        if (input.address_1 !== undefined) {
            dealPayload['address_1'] = input.address_1;
        }
        if (input.address_2 !== undefined) {
            dealPayload['address_2'] = input.address_2;
        }
        if (input.city !== undefined) {
            dealPayload['city'] = input.city;
        }
        if (input.state !== undefined) {
            dealPayload['state'] = input.state;
        }
        if (input.postal_code !== undefined) {
            dealPayload['postal_code'] = input.postal_code;
        }
        if (input.country !== undefined) {
            dealPayload['country'] = input.country;
        }
        if (input.is_archived !== undefined) {
            dealPayload['is_archived'] = input.is_archived;
        }

        const params: Record<string, string> = {};
        if (input.deliver_assignment_email !== undefined) {
            params['deliver_assignment_email'] = String(input.deliver_assignment_email);
        }

        // https://app.pipelinecrm.com/api/docs/introduction
        const response = await nango.post({
            endpoint: '/api/v3/deals',
            data: {
                deal: dealPayload
            },
            params,
            retries: 3
        });

        const providerDeal = ProviderDealSchema.safeParse(response.data);

        if (!providerDeal.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'The API returned an unexpected response shape when creating the deal.',
                details: providerDeal.error.issues
            });
        }

        const deal = providerDeal.data;

        return {
            id: deal.id,
            ...(deal.name != null && { name: deal.name }),
            ...(deal.summary != null && { summary: deal.summary }),
            ...(deal.user_id != null && { user_id: deal.user_id }),
            ...(deal.created_at != null && { created_at: deal.created_at }),
            ...(deal.updated_at != null && { updated_at: deal.updated_at }),
            ...(deal.is_archived != null && { is_archived: deal.is_archived }),
            ...(deal.primary_contact_id != null && { primary_contact_id: deal.primary_contact_id }),
            ...(deal.company_id != null && { company_id: deal.company_id }),
            ...(deal.deal_stage_id != null && { deal_stage_id: deal.deal_stage_id }),
            ...(deal.deal_pipeline_id != null && { deal_pipeline_id: deal.deal_pipeline_id }),
            ...(deal.status != null && { status: deal.status }),
            ...(deal.probability != null && { probability: deal.probability }),
            ...(deal.value != null && { value: deal.value }),
            ...(deal.expected_close_date != null && { expected_close_date: deal.expected_close_date }),
            ...(deal.closed_time != null && { closed_time: deal.closed_time }),
            ...(deal.deal_loss_reason_id != null && { deal_loss_reason_id: deal.deal_loss_reason_id }),
            ...(deal.deal_loss_reason_notes != null && { deal_loss_reason_notes: deal.deal_loss_reason_notes }),
            ...(deal.deal_won_reason_id != null && { deal_won_reason_id: deal.deal_won_reason_id }),
            ...(deal.deal_won_reason_notes != null && { deal_won_reason_notes: deal.deal_won_reason_notes }),
            ...(deal.source_id != null && { source_id: deal.source_id }),
            ...(deal.custom_fields != null && { custom_fields: deal.custom_fields }),
            ...(deal.tag_ids != null && { tag_ids: deal.tag_ids }),
            ...(deal.person_ids != null && { person_ids: deal.person_ids }),
            ...(deal.shared_user_ids != null && { shared_user_ids: deal.shared_user_ids }),
            ...(deal.address_1 != null && { address_1: deal.address_1 }),
            ...(deal.address_2 != null && { address_2: deal.address_2 }),
            ...(deal.city != null && { city: deal.city }),
            ...(deal.state != null && { state: deal.state }),
            ...(deal.postal_code != null && { postal_code: deal.postal_code }),
            ...(deal.country != null && { country: deal.country }),
            ...(deal.revenue_type_id != null && { revenue_type_id: deal.revenue_type_id }),
            ...(deal.import_id != null && { import_id: deal.import_id }),
            ...(deal.next_entry_name != null && { next_entry_name: deal.next_entry_name }),
            ...(deal.next_entry_id != null && { next_entry_id: deal.next_entry_id }),
            ...(deal.next_entry_due != null && { next_entry_due: deal.next_entry_due }),
            ...(deal.next_entry_all_day != null && { next_entry_all_day: deal.next_entry_all_day })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
