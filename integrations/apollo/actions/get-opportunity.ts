import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the opportunity to retrieve. Example: "6a0af21285c69e000cc28695"')
});

const CurrencySchema = z.object({
    name: z.string(),
    iso_code: z.string(),
    symbol: z.string()
});

const AccountSchema = z.object({
    id: z.string(),
    name: z.string(),
    domain: z.string().optional(),
    team_id: z.string(),
    organization_id: z.string().optional(),
    account_stage_id: z.string().optional(),
    source: z.string().optional(),
    original_source: z.string().optional(),
    creator_id: z.string().nullable().optional(),
    owner_id: z.string().nullable().optional(),
    created_at: z.string().optional(),
    phone: z.string().nullable().optional(),
    phone_status: z.string().optional(),
    hubspot_id: z.string().nullable().optional(),
    salesforce_id: z.string().nullable().optional()
});

const OpportunitySchema = z.object({
    id: z.string(),
    team_id: z.string(),
    owner_id: z.string().nullable().optional(),
    salesforce_owner_id: z.string().nullable().optional(),
    amount: z.number().nullable().optional(),
    closed_date: z.string().nullable().optional(),
    account_id: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    is_closed: z.boolean().nullable().optional(),
    is_won: z.boolean().nullable().optional(),
    name: z.string(),
    stage_name: z.string().nullable().optional(),
    opportunity_stage_id: z.string().nullable().optional(),
    source: z.string(),
    salesforce_id: z.string().nullable().optional(),
    created_at: z.string().optional(),
    actual_close_date: z.string().nullable().optional(),
    next_step: z.string().nullable().optional(),
    next_step_date: z.string().nullable().optional(),
    closed_lost_reason: z.string().nullable().optional(),
    closed_won_reason: z.string().nullable().optional(),
    forecast_category: z.string().nullable().optional(),
    deal_probability: z.number().nullable().optional(),
    created_by_id: z.string(),
    current_solutions: z.string().nullable().optional(),
    deal_source: z.string().nullable().optional(),
    manually_updated_probability: z.string().nullable().optional(),
    manually_updated_forecast: z.string().nullable().optional(),
    crm_id: z.string().nullable().optional(),
    crm_record_url: z.string().nullable().optional(),
    crm_owner_id: z.string().nullable().optional(),
    probability: z.string().nullable().optional(),
    opportunity_pipeline_id: z.string().nullable().optional(),
    stage_updated_at: z.string().nullable().optional(),
    next_step_last_updated_at: z.string().nullable().optional(),
    exchange_rate_code: z.string().nullable().optional(),
    exchange_rate_value: z.number().nullable().optional(),
    amount_in_team_currency: z.number().nullable().optional(),
    forecasted_revenue: z.number().nullable().optional(),
    last_activity_date: z.string().nullable().optional(),
    existence_level: z.string().nullable().optional(),
    typed_custom_fields: z.record(z.string(), z.unknown()).optional(),
    opportunity_rule_config_statuses: z.array(z.unknown()).optional(),
    opportunity_contact_roles: z.array(z.unknown()).optional(),
    currency: CurrencySchema.optional(),
    num_contacts: z.number().nullable().optional(),
    account: AccountSchema.optional()
});

const ProviderResponseSchema = z.object({
    opportunity: OpportunitySchema
});

const OutputSchema = z.object({
    id: z.string(),
    team_id: z.string(),
    owner_id: z.string().optional(),
    salesforce_owner_id: z.string().optional(),
    amount: z.number().optional(),
    closed_date: z.string().optional(),
    account_id: z.string().optional(),
    description: z.string().optional(),
    is_closed: z.boolean().optional(),
    is_won: z.boolean().optional(),
    name: z.string(),
    stage_name: z.string().optional(),
    opportunity_stage_id: z.string().optional(),
    source: z.string().optional(),
    salesforce_id: z.string().optional(),
    created_at: z.string().optional(),
    actual_close_date: z.string().optional(),
    next_step: z.string().optional(),
    next_step_date: z.string().optional(),
    closed_lost_reason: z.string().optional(),
    closed_won_reason: z.string().optional(),
    forecast_category: z.string().optional(),
    deal_probability: z.number().optional(),
    created_by_id: z.string().optional(),
    current_solutions: z.string().optional(),
    deal_source: z.string().optional(),
    manually_updated_probability: z.string().optional(),
    manually_updated_forecast: z.string().optional(),
    crm_id: z.string().optional(),
    crm_record_url: z.string().optional(),
    crm_owner_id: z.string().optional(),
    probability: z.string().optional(),
    opportunity_pipeline_id: z.string().optional(),
    stage_updated_at: z.string().optional(),
    next_step_last_updated_at: z.string().optional(),
    exchange_rate_code: z.string().optional(),
    exchange_rate_value: z.number().optional(),
    amount_in_team_currency: z.number().optional(),
    forecasted_revenue: z.number().optional(),
    last_activity_date: z.string().optional(),
    existence_level: z.string().optional(),
    typed_custom_fields: z.record(z.string(), z.unknown()).optional(),
    opportunity_rule_config_statuses: z.array(z.unknown()).optional(),
    opportunity_contact_roles: z.array(z.unknown()).optional(),
    currency: CurrencySchema.optional(),
    num_contacts: z.number().optional(),
    account: AccountSchema.optional()
});

const action = createAction({
    description: 'Retrieve a single opportunity from Apollo.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-opportunity',
        group: 'Opportunities'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.apollo.io/reference/view-deal
        const response = await nango.get({
            endpoint: `/v1/opportunities/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Opportunity not found',
                id: input.id
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const opp = providerResponse.opportunity;

        return {
            id: opp.id,
            team_id: opp.team_id,
            ...(opp.owner_id != null && { owner_id: opp.owner_id }),
            ...(opp.salesforce_owner_id != null && { salesforce_owner_id: opp.salesforce_owner_id }),
            ...(opp.amount != null && { amount: opp.amount }),
            ...(opp.closed_date != null && { closed_date: opp.closed_date }),
            ...(opp.account_id != null && { account_id: opp.account_id }),
            ...(opp.description != null && { description: opp.description }),
            ...(opp.is_closed != null && { is_closed: opp.is_closed }),
            ...(opp.is_won != null && { is_won: opp.is_won }),
            name: opp.name,
            ...(opp.stage_name != null && { stage_name: opp.stage_name }),
            ...(opp.opportunity_stage_id != null && { opportunity_stage_id: opp.opportunity_stage_id }),
            ...(opp.source != null && { source: opp.source }),
            ...(opp.salesforce_id != null && { salesforce_id: opp.salesforce_id }),
            ...(opp.created_at != null && { created_at: opp.created_at }),
            ...(opp.actual_close_date != null && { actual_close_date: opp.actual_close_date }),
            ...(opp.next_step != null && { next_step: opp.next_step }),
            ...(opp.next_step_date != null && { next_step_date: opp.next_step_date }),
            ...(opp.closed_lost_reason != null && { closed_lost_reason: opp.closed_lost_reason }),
            ...(opp.closed_won_reason != null && { closed_won_reason: opp.closed_won_reason }),
            ...(opp.forecast_category != null && { forecast_category: opp.forecast_category }),
            ...(opp.deal_probability != null && { deal_probability: opp.deal_probability }),
            ...(opp.created_by_id != null && { created_by_id: opp.created_by_id }),
            ...(opp.current_solutions != null && { current_solutions: opp.current_solutions }),
            ...(opp.deal_source != null && { deal_source: opp.deal_source }),
            ...(opp.manually_updated_probability != null && { manually_updated_probability: opp.manually_updated_probability }),
            ...(opp.manually_updated_forecast != null && { manually_updated_forecast: opp.manually_updated_forecast }),
            ...(opp.crm_id != null && { crm_id: opp.crm_id }),
            ...(opp.crm_record_url != null && { crm_record_url: opp.crm_record_url }),
            ...(opp.crm_owner_id != null && { crm_owner_id: opp.crm_owner_id }),
            ...(opp.probability != null && { probability: opp.probability }),
            ...(opp.opportunity_pipeline_id != null && { opportunity_pipeline_id: opp.opportunity_pipeline_id }),
            ...(opp.stage_updated_at != null && { stage_updated_at: opp.stage_updated_at }),
            ...(opp.next_step_last_updated_at != null && { next_step_last_updated_at: opp.next_step_last_updated_at }),
            ...(opp.exchange_rate_code != null && { exchange_rate_code: opp.exchange_rate_code }),
            ...(opp.exchange_rate_value != null && { exchange_rate_value: opp.exchange_rate_value }),
            ...(opp.amount_in_team_currency != null && { amount_in_team_currency: opp.amount_in_team_currency }),
            ...(opp.forecasted_revenue != null && { forecasted_revenue: opp.forecasted_revenue }),
            ...(opp.last_activity_date != null && { last_activity_date: opp.last_activity_date }),
            ...(opp.existence_level != null && { existence_level: opp.existence_level }),
            ...(opp.typed_custom_fields != null && { typed_custom_fields: opp.typed_custom_fields }),
            ...(opp.opportunity_rule_config_statuses != null && { opportunity_rule_config_statuses: opp.opportunity_rule_config_statuses }),
            ...(opp.opportunity_contact_roles != null && { opportunity_contact_roles: opp.opportunity_contact_roles }),
            ...(opp.currency != null && { currency: opp.currency }),
            ...(opp.num_contacts != null && { num_contacts: opp.num_contacts }),
            ...(opp.account != null && { account: opp.account })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
