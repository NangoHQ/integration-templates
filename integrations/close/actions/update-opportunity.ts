import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Opportunity ID. Example: "oppo_8eB77gAdf8FMy6GsNHEy84f7uoeEWv55slvUjKQZpJt"'),
    status_id: z.string().optional().describe('Status ID. Example: "stat_5ZdiZqcSIkoGVnNOyxiEY58eTGQmFNG3LPlEVQ4V7Nk"'),
    value: z.number().optional().describe('Value in USD dollars (not cents). Example: 50000'),
    value_period: z.enum(['one_time', 'monthly', 'annual']).optional().describe('Value period. Example: "one_time"'),
    confidence: z.number().optional().describe('Confidence percentage. Example: 75'),
    note: z.string().optional().describe('Plaintext note.'),
    note_html: z.string().nullable().optional().describe('Rich-text HTML note. Pass null to clear.'),
    contact_id: z.string().nullable().optional().describe('Contact ID. Pass null to remove association.'),
    user_id: z.string().nullable().optional().describe('User ID. Pass null to remove assignment.'),
    date_won: z.string().nullable().optional().describe('Date won (ISO 8601). Pass null to clear.'),
    date_lost: z.string().nullable().optional().describe('Date lost (ISO 8601). Pass null to clear.'),
    status: z.string().optional().describe('Deprecated status name. Prefer status_id.')
});

const ProviderOpportunitySchema = z.object({
    id: z.string(),
    lead_id: z.string(),
    status_id: z.string(),
    status_label: z.string().optional(),
    status_type: z.enum(['won', 'lost', 'active']).optional(),
    value: z.number().nullable().optional(),
    value_period: z.enum(['one_time', 'monthly', 'annual']).optional(),
    value_currency: z.string().nullable().optional(),
    value_formatted: z.string().nullable().optional(),
    annualized_value: z.number().nullable().optional(),
    annualized_expected_value: z.number().nullable().optional(),
    expected_value: z.number().nullable().optional(),
    confidence: z.number().optional(),
    note: z.string().nullable().optional(),
    note_html: z.string().nullable().optional(),
    contact_id: z.string().nullable().optional(),
    contact_name: z.string().nullable().optional(),
    user_id: z.string().optional(),
    user_name: z.string().nullable().optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    date_won: z.string().nullable().optional(),
    date_lost: z.string().nullable().optional(),
    organization_id: z.string().optional(),
    pipeline_id: z.string().nullable().optional(),
    pipeline_name: z.string().nullable().optional(),
    lead_name: z.string().nullable().optional(),
    created_by: z.string().nullable().optional(),
    created_by_name: z.string().nullable().optional(),
    updated_by: z.string().nullable().optional(),
    updated_by_name: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    lead_id: z.string(),
    status_id: z.string(),
    status_label: z.string().optional(),
    status_type: z.enum(['won', 'lost', 'active']).optional(),
    value: z.number().optional(),
    value_period: z.enum(['one_time', 'monthly', 'annual']).optional(),
    value_currency: z.string().optional(),
    value_formatted: z.string().optional(),
    annualized_value: z.number().optional(),
    annualized_expected_value: z.number().optional(),
    expected_value: z.number().optional(),
    confidence: z.number().optional(),
    note: z.string().optional(),
    note_html: z.string().optional(),
    contact_id: z.string().optional(),
    contact_name: z.string().optional(),
    user_id: z.string().optional(),
    user_name: z.string().optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    date_won: z.string().optional(),
    date_lost: z.string().optional(),
    organization_id: z.string().optional(),
    pipeline_id: z.string().optional(),
    pipeline_name: z.string().optional(),
    lead_name: z.string().optional(),
    created_by: z.string().optional(),
    created_by_name: z.string().optional(),
    updated_by: z.string().optional(),
    updated_by_name: z.string().optional()
});

const action = createAction({
    description: 'Update an opportunity.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {};

        if (input.status_id !== undefined) {
            data['status_id'] = input.status_id;
        }
        if (input.value !== undefined) {
            data['value'] = input.value;
        }
        if (input.value_period !== undefined) {
            data['value_period'] = input.value_period;
        }
        if (input.confidence !== undefined) {
            data['confidence'] = input.confidence;
        }
        if (input.note !== undefined) {
            data['note'] = input.note;
        }
        if (input.note_html !== undefined) {
            data['note_html'] = input.note_html;
        }
        if (input.contact_id !== undefined) {
            data['contact_id'] = input.contact_id;
        }
        if (input.user_id !== undefined) {
            data['user_id'] = input.user_id;
        }
        if (input.date_won !== undefined) {
            data['date_won'] = input.date_won;
        }
        if (input.date_lost !== undefined) {
            data['date_lost'] = input.date_lost;
        }
        if (input.status !== undefined) {
            data['status'] = input.status;
        }

        const response = await nango.put({
            // https://developer.close.com/api/resources/opportunities/update
            endpoint: `/v1/opportunity/${encodeURIComponent(input.id)}/`,
            data,
            retries: 1
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Opportunity not found: ${input.id}`
            });
        }

        const providerOpportunity = ProviderOpportunitySchema.parse(response.data);

        return {
            id: providerOpportunity.id,
            lead_id: providerOpportunity.lead_id,
            status_id: providerOpportunity.status_id,
            ...(providerOpportunity.status_label !== undefined &&
                providerOpportunity.status_label !== null && { status_label: providerOpportunity.status_label }),
            ...(providerOpportunity.status_type !== undefined && providerOpportunity.status_type !== null && { status_type: providerOpportunity.status_type }),
            ...(providerOpportunity.value !== undefined && providerOpportunity.value !== null && { value: providerOpportunity.value }),
            ...(providerOpportunity.value_period !== undefined &&
                providerOpportunity.value_period !== null && { value_period: providerOpportunity.value_period }),
            ...(providerOpportunity.value_currency !== undefined &&
                providerOpportunity.value_currency !== null && { value_currency: providerOpportunity.value_currency }),
            ...(providerOpportunity.value_formatted !== undefined &&
                providerOpportunity.value_formatted !== null && { value_formatted: providerOpportunity.value_formatted }),
            ...(providerOpportunity.annualized_value !== undefined &&
                providerOpportunity.annualized_value !== null && { annualized_value: providerOpportunity.annualized_value }),
            ...(providerOpportunity.annualized_expected_value !== undefined &&
                providerOpportunity.annualized_expected_value !== null && { annualized_expected_value: providerOpportunity.annualized_expected_value }),
            ...(providerOpportunity.expected_value !== undefined &&
                providerOpportunity.expected_value !== null && { expected_value: providerOpportunity.expected_value }),
            ...(providerOpportunity.confidence !== undefined && providerOpportunity.confidence !== null && { confidence: providerOpportunity.confidence }),
            ...(providerOpportunity.note !== undefined && providerOpportunity.note !== null && { note: providerOpportunity.note }),
            ...(providerOpportunity.note_html !== undefined && providerOpportunity.note_html !== null && { note_html: providerOpportunity.note_html }),
            ...(providerOpportunity.contact_id !== undefined && providerOpportunity.contact_id !== null && { contact_id: providerOpportunity.contact_id }),
            ...(providerOpportunity.contact_name !== undefined &&
                providerOpportunity.contact_name !== null && { contact_name: providerOpportunity.contact_name }),
            ...(providerOpportunity.user_id !== undefined && providerOpportunity.user_id !== null && { user_id: providerOpportunity.user_id }),
            ...(providerOpportunity.user_name !== undefined && providerOpportunity.user_name !== null && { user_name: providerOpportunity.user_name }),
            ...(providerOpportunity.date_created !== undefined &&
                providerOpportunity.date_created !== null && { date_created: providerOpportunity.date_created }),
            ...(providerOpportunity.date_updated !== undefined &&
                providerOpportunity.date_updated !== null && { date_updated: providerOpportunity.date_updated }),
            ...(providerOpportunity.date_won !== undefined && providerOpportunity.date_won !== null && { date_won: providerOpportunity.date_won }),
            ...(providerOpportunity.date_lost !== undefined && providerOpportunity.date_lost !== null && { date_lost: providerOpportunity.date_lost }),
            ...(providerOpportunity.organization_id !== undefined &&
                providerOpportunity.organization_id !== null && { organization_id: providerOpportunity.organization_id }),
            ...(providerOpportunity.pipeline_id !== undefined && providerOpportunity.pipeline_id !== null && { pipeline_id: providerOpportunity.pipeline_id }),
            ...(providerOpportunity.pipeline_name !== undefined &&
                providerOpportunity.pipeline_name !== null && { pipeline_name: providerOpportunity.pipeline_name }),
            ...(providerOpportunity.lead_name !== undefined && providerOpportunity.lead_name !== null && { lead_name: providerOpportunity.lead_name }),
            ...(providerOpportunity.created_by !== undefined && providerOpportunity.created_by !== null && { created_by: providerOpportunity.created_by }),
            ...(providerOpportunity.created_by_name !== undefined &&
                providerOpportunity.created_by_name !== null && { created_by_name: providerOpportunity.created_by_name }),
            ...(providerOpportunity.updated_by !== undefined && providerOpportunity.updated_by !== null && { updated_by: providerOpportunity.updated_by }),
            ...(providerOpportunity.updated_by_name !== undefined &&
                providerOpportunity.updated_by_name !== null && { updated_by_name: providerOpportunity.updated_by_name })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
