import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Name of the deal (human-readable). Example: Massive Q3 Deal'),
    owner_id: z.string().optional().describe('ID of the deal owner in your Apollo team. Retrieve via Get a List of Users. Example: 66302798d03b9601c7934ebf'),
    account_id: z
        .string()
        .optional()
        .describe('ID of the target account (company) in Apollo. Find via Organization Search (organization_id). Example: 5e66b6381e05b4008c8331b8'),
    amount: z
        .string()
        .optional()
        .describe('Monetary value as a string. Do not include commas or currency symbols; commas cause the amount to be left blank. Example: 55123478'),
    opportunity_stage_id: z
        .string()
        .optional()
        .describe('ID of the deal stage in your Apollo team. Retrieve via List Deal Stages. Example: 6095a710bd01d100a506d4bd'),
    closed_date: z.string().optional().describe('Estimated close date in YYYY-MM-DD format. Example: 2025-10-30'),
    typed_custom_fields: z.record(z.string(), z.any()).optional()
});

const CurrencySchema = z.object({
    name: z.string().optional(),
    iso_code: z.string().optional(),
    symbol: z.string().optional()
});

const OpportunityContactSchema = z.object({
    id: z.string(),
    contact_id: z.string(),
    role: z.string().optional().nullable()
});

const ProviderOpportunitySchema = z.object({
    id: z.string(),
    team_id: z.string().optional(),
    owner_id: z.string().optional().nullable(),
    salesforce_owner_id: z.string().optional().nullable(),
    amount: z.number().optional().nullable(),
    closed_date: z.string().optional().nullable(),
    account_id: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    is_closed: z.boolean().optional().nullable(),
    is_won: z.boolean().optional().nullable(),
    name: z.string(),
    stage_name: z.string().optional().nullable(),
    opportunity_stage_id: z.string().optional().nullable(),
    source: z.string().optional(),
    salesforce_id: z.string().optional().nullable(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    actual_close_date: z.string().optional().nullable(),
    next_step: z.string().optional().nullable(),
    next_step_date: z.string().optional().nullable(),
    closed_lost_reason: z.string().optional().nullable(),
    closed_won_reason: z.string().optional().nullable(),
    forecast_category: z.string().optional().nullable(),
    deal_probability: z.number().optional().nullable(),
    created_by_id: z.string().optional().nullable(),
    currency: CurrencySchema.optional().nullable(),
    opportunity_contact_roles: z.array(OpportunityContactSchema).optional().nullable()
});

const ProviderResponseSchema = z.object({
    opportunity: ProviderOpportunitySchema
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    amount: z.number().optional(),
    closed_date: z.string().optional(),
    account_id: z.string().optional(),
    owner_id: z.string().optional(),
    opportunity_stage_id: z.string().optional(),
    is_closed: z.boolean().optional(),
    is_won: z.boolean().optional(),
    created_at: z.string().optional()
});

const action = createAction({
    description: 'Create an opportunity in Apollo',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-opportunity',
        group: 'Opportunities'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, unknown> = {
            name: input.name
        };

        if (input.owner_id !== undefined) {
            requestBody['owner_id'] = input.owner_id;
        }
        if (input.account_id !== undefined) {
            requestBody['account_id'] = input.account_id;
        }
        if (input.amount !== undefined) {
            requestBody['amount'] = input.amount;
        }
        if (input.opportunity_stage_id !== undefined) {
            requestBody['opportunity_stage_id'] = input.opportunity_stage_id;
        }
        if (input.closed_date !== undefined) {
            requestBody['closed_date'] = input.closed_date;
        }
        if (input.typed_custom_fields !== undefined) {
            requestBody['typed_custom_fields'] = input.typed_custom_fields;
        }

        // https://docs.apollo.io/reference/create-deal
        const response = await nango.post({
            endpoint: '/v1/opportunities',
            data: requestBody,
            retries: 3
        });

        const rawData = response.data;
        if (!rawData || typeof rawData !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Apollo API: expected object with opportunity property'
            });
        }

        const parsed = ProviderResponseSchema.safeParse(rawData);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse Apollo API response',
                details: parsed.error.message
            });
        }

        const opportunity = parsed.data.opportunity;

        return {
            id: opportunity.id,
            name: opportunity.name,
            ...(opportunity.amount != null && { amount: opportunity.amount }),
            ...(opportunity.closed_date != null && { closed_date: opportunity.closed_date }),
            ...(opportunity.account_id != null && { account_id: opportunity.account_id }),
            ...(opportunity.owner_id != null && { owner_id: opportunity.owner_id }),
            ...(opportunity.opportunity_stage_id != null && { opportunity_stage_id: opportunity.opportunity_stage_id }),
            ...(opportunity.is_closed != null && { is_closed: opportunity.is_closed }),
            ...(opportunity.is_won != null && { is_won: opportunity.is_won }),
            ...(opportunity.created_at != null && { created_at: opportunity.created_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
