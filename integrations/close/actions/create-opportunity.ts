import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    lead_id: z.string().describe('Lead ID. Example: "lead_mELh8FRqV6vRWJ5bgGdx7GpifIkEnoQFHg0hsxmQI1z"'),
    status_id: z.string().describe('Opportunity status ID. Example: "stat_YT79kszvqlYbs5HhEYBEtr0CkZ41Ey0RqXpLaUsr1li"'),
    pipeline_id: z.string().optional().describe('Pipeline ID. Example: "pipe_4RR4Vuxbp8jRIcQEzEzcEJ"'),
    note: z.string().optional().describe('Note about the opportunity'),
    confidence: z.number().int().min(0).max(100).optional().describe('Confidence level (0-100)'),
    value: z.number().int().optional().describe('Opportunity value in whole USD dollars. Example: 50000'),
    value_period: z.enum(['one_time', 'monthly', 'annual']).optional().describe('Value period: one_time, monthly, or annual'),
    user_id: z.string().optional().describe('User ID to assign the opportunity to'),
    contact_id: z.string().optional().describe('Contact ID associated with the opportunity'),
    date_won: z.string().optional().describe('Date the opportunity was won. Example: "2026-06-19"')
});

const ProviderOpportunitySchema = z.object({
    id: z.string(),
    lead_id: z.string().optional(),
    lead_name: z.string().optional(),
    status_id: z.string().optional(),
    status_label: z.string().optional(),
    pipeline_id: z.string().optional(),
    pipeline_name: z.string().optional(),
    contact_id: z.string().optional(),
    contact_name: z.string().optional(),
    user_id: z.string().optional(),
    user_name: z.string().optional(),
    note: z.string().optional(),
    confidence: z.number().int().optional(),
    value: z.number().int().optional(),
    value_period: z.enum(['one_time', 'monthly', 'annual']).optional(),
    annualized_value: z.number().optional(),
    date_won: z.string().nullable().optional(),
    date_lost: z.string().nullable().optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    organization_id: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    lead_id: z.string().optional(),
    lead_name: z.string().optional(),
    status_id: z.string().optional(),
    status_label: z.string().optional(),
    pipeline_id: z.string().optional(),
    pipeline_name: z.string().optional(),
    contact_id: z.string().optional(),
    contact_name: z.string().optional(),
    user_id: z.string().optional(),
    user_name: z.string().optional(),
    note: z.string().optional(),
    confidence: z.number().int().optional(),
    value: z.number().int().optional(),
    value_period: z.enum(['one_time', 'monthly', 'annual']).optional(),
    annualized_value: z.number().optional(),
    date_won: z.string().optional(),
    date_lost: z.string().optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    organization_id: z.string().optional()
});

const action = createAction({
    description: 'Create an opportunity',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write:opportunity'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {
            lead_id: input.lead_id,
            status_id: input.status_id
        };

        if (input.pipeline_id !== undefined) {
            data['pipeline_id'] = input.pipeline_id;
        }
        if (input.note !== undefined) {
            data['note'] = input.note;
        }
        if (input.confidence !== undefined) {
            data['confidence'] = input.confidence;
        }
        if (input.value !== undefined) {
            data['value'] = input.value;
        }
        if (input.value_period !== undefined) {
            data['value_period'] = input.value_period;
        }
        if (input.user_id !== undefined) {
            data['user_id'] = input.user_id;
        }
        if (input.contact_id !== undefined) {
            data['contact_id'] = input.contact_id;
        }
        if (input.date_won !== undefined) {
            data['date_won'] = input.date_won;
        }

        // https://developer.close.com/
        const response = await nango.post({
            endpoint: '/v1/opportunity/',
            data,
            retries: 3
        });

        if (response.status !== 200 && response.status !== 201) {
            throw new nango.ActionError({
                type: 'create_failed',
                message: `Failed to create opportunity: ${response.status} ${response.statusText || ''}`
            });
        }

        const providerOpportunity = ProviderOpportunitySchema.parse(response.data);

        return {
            id: providerOpportunity.id,
            ...(providerOpportunity.lead_id !== undefined && { lead_id: providerOpportunity.lead_id }),
            ...(providerOpportunity.lead_name !== undefined && { lead_name: providerOpportunity.lead_name }),
            ...(providerOpportunity.status_id !== undefined && { status_id: providerOpportunity.status_id }),
            ...(providerOpportunity.status_label !== undefined && { status_label: providerOpportunity.status_label }),
            ...(providerOpportunity.pipeline_id !== undefined && { pipeline_id: providerOpportunity.pipeline_id }),
            ...(providerOpportunity.pipeline_name !== undefined && { pipeline_name: providerOpportunity.pipeline_name }),
            ...(providerOpportunity.contact_id !== undefined && { contact_id: providerOpportunity.contact_id }),
            ...(providerOpportunity.contact_name !== undefined && { contact_name: providerOpportunity.contact_name }),
            ...(providerOpportunity.user_id !== undefined && { user_id: providerOpportunity.user_id }),
            ...(providerOpportunity.user_name !== undefined && { user_name: providerOpportunity.user_name }),
            ...(providerOpportunity.note !== undefined && { note: providerOpportunity.note }),
            ...(providerOpportunity.confidence !== undefined && { confidence: providerOpportunity.confidence }),
            ...(providerOpportunity.value !== undefined && { value: providerOpportunity.value }),
            ...(providerOpportunity.value_period !== undefined && { value_period: providerOpportunity.value_period }),
            ...(providerOpportunity.annualized_value !== undefined && { annualized_value: providerOpportunity.annualized_value }),
            ...(providerOpportunity.date_won !== null && providerOpportunity.date_won !== undefined && { date_won: providerOpportunity.date_won }),
            ...(providerOpportunity.date_lost !== null && providerOpportunity.date_lost !== undefined && { date_lost: providerOpportunity.date_lost }),
            ...(providerOpportunity.date_created !== undefined && { date_created: providerOpportunity.date_created }),
            ...(providerOpportunity.date_updated !== undefined && { date_updated: providerOpportunity.date_updated }),
            ...(providerOpportunity.organization_id !== undefined && { organization_id: providerOpportunity.organization_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
