import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ad_account_id: z.string().describe('Ad account ID. Example: "549770573673"'),
    name: z.string().describe('Campaign name.'),
    objective_type: z
        .string()
        .describe(
            'Campaign objective type. Example: "AWARENESS", "TRAFFIC", "CONVERSIONS", "VIDEO_VIEW", "CONSIDERATION", "WEB_CONVERSION", "CATALOG_SALES", "OFFLINE_SALES", "LEAD_GENERATION".'
        ),
    status: z.enum(['ACTIVE', 'PAUSED', 'ARCHIVED']).optional().describe('Campaign status.'),
    daily_spend_cap: z
        .number()
        .optional()
        .describe(
            'Daily spend cap in micro-currency (major currency unit * 1,000,000). Required for Campaign Budget Optimization unless lifetime_spend_cap and end_time are set.'
        ),
    lifetime_spend_cap: z.number().optional().describe('Lifetime spend cap in micro-currency. Must be used with end_time for Campaign Budget Optimization.'),
    end_time: z
        .number()
        .optional()
        .describe('Campaign end time as a Unix timestamp in seconds. Required when lifetime_spend_cap is set for Campaign Budget Optimization.'),
    is_campaign_budget_optimization: z.boolean().optional().describe('Whether the campaign uses Campaign Budget Optimization (CBO). Defaults to true.'),
    is_flexible_daily_budgets: z.boolean().optional().describe('Whether the campaign uses flexible daily budgets.'),
    is_automated_budget: z.boolean().optional().describe('Whether the campaign uses automated budget.'),
    tracking_urls: z.record(z.string(), z.string()).optional().describe('Tracking URLs for the campaign.'),
    start_time: z.number().optional().describe('Campaign start time as a Unix timestamp in seconds.')
});

const CampaignSchema = z.object({
    id: z.string(),
    ad_account_id: z.string(),
    name: z.string(),
    status: z.string(),
    objective_type: z.string(),
    daily_spend_cap: z.number().nullable().optional(),
    lifetime_spend_cap: z.number().nullable().optional(),
    end_time: z.number().nullable().optional(),
    start_time: z.number().nullable().optional(),
    is_campaign_budget_optimization: z.boolean().nullable().optional(),
    is_flexible_daily_budgets: z.boolean().nullable().optional(),
    is_automated_budget: z.boolean().nullable().optional(),
    tracking_urls: z.record(z.string(), z.string()).nullable().optional(),
    created_time: z.number().nullable().optional(),
    updated_time: z.number().nullable().optional()
});

const ProviderExceptionSchema = z.object({
    message: z.string(),
    error_code: z.number().optional()
});

const ProviderItemSchema = z.object({
    data: CampaignSchema.nullable().optional(),
    exceptions: z.array(ProviderExceptionSchema).optional()
});

const ProviderResponseSchema = z.object({
    items: z.array(ProviderItemSchema)
});

const OutputSchema = z.object({
    id: z.string(),
    ad_account_id: z.string(),
    name: z.string(),
    status: z.string(),
    objective_type: z.string(),
    daily_spend_cap: z.number().optional(),
    lifetime_spend_cap: z.number().optional(),
    end_time: z.number().optional(),
    start_time: z.number().optional(),
    is_campaign_budget_optimization: z.boolean().optional(),
    is_flexible_daily_budgets: z.boolean().optional(),
    is_automated_budget: z.boolean().optional(),
    tracking_urls: z.record(z.string(), z.string()).optional(),
    created_time: z.number().optional(),
    updated_time: z.number().optional()
});

const action = createAction({
    description: 'Create a campaign.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown>[] = [
            {
                name: input.name,
                objective_type: input.objective_type,
                ...(input.status !== undefined && { status: input.status }),
                ...(input.daily_spend_cap !== undefined && { daily_spend_cap: input.daily_spend_cap }),
                ...(input.lifetime_spend_cap !== undefined && { lifetime_spend_cap: input.lifetime_spend_cap }),
                ...(input.end_time !== undefined && { end_time: input.end_time }),
                ...(input.is_campaign_budget_optimization !== undefined && { is_campaign_budget_optimization: input.is_campaign_budget_optimization }),
                ...(input.is_flexible_daily_budgets !== undefined && { is_flexible_daily_budgets: input.is_flexible_daily_budgets }),
                ...(input.is_automated_budget !== undefined && { is_automated_budget: input.is_automated_budget }),
                ...(input.tracking_urls !== undefined && { tracking_urls: input.tracking_urls }),
                ...(input.start_time !== undefined && { start_time: input.start_time })
            }
        ];

        const response = await nango.post({
            // https://developers.pinterest.com/docs/api/v5/#operation/campaigns/create
            endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}/campaigns`,
            data: body,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const item = providerResponse.items[0];

        if (!item) {
            throw new nango.ActionError({
                type: 'empty_response',
                message: 'Pinterest returned an empty items array.'
            });
        }

        if (item.exceptions && item.exceptions.length > 0) {
            const exception = item.exceptions[0];
            if (exception) {
                throw new nango.ActionError({
                    type: 'provider_error',
                    message: exception.message,
                    error_code: exception.error_code,
                    ad_account_id: input.ad_account_id
                });
            }
        }

        if (!item.data) {
            throw new nango.ActionError({
                type: 'missing_data',
                message: 'Pinterest returned an item with no campaign data.'
            });
        }

        const campaign = item.data;

        return {
            id: campaign.id,
            ad_account_id: campaign.ad_account_id,
            name: campaign.name,
            status: campaign.status,
            objective_type: campaign.objective_type,
            ...(campaign.daily_spend_cap != null && { daily_spend_cap: campaign.daily_spend_cap }),
            ...(campaign.lifetime_spend_cap != null && { lifetime_spend_cap: campaign.lifetime_spend_cap }),
            ...(campaign.end_time != null && { end_time: campaign.end_time }),
            ...(campaign.start_time != null && { start_time: campaign.start_time }),
            ...(campaign.is_campaign_budget_optimization != null && { is_campaign_budget_optimization: campaign.is_campaign_budget_optimization }),
            ...(campaign.is_flexible_daily_budgets != null && { is_flexible_daily_budgets: campaign.is_flexible_daily_budgets }),
            ...(campaign.is_automated_budget != null && { is_automated_budget: campaign.is_automated_budget }),
            ...(campaign.tracking_urls != null && { tracking_urls: campaign.tracking_urls }),
            ...(campaign.created_time != null && { created_time: campaign.created_time }),
            ...(campaign.updated_time != null && { updated_time: campaign.updated_time })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
