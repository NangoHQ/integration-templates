import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().optional().describe('Campaign ID to filter analytics by. Omit to get analytics for all campaigns.'),
    start_date: z.string().optional().describe('Start date in YYYY-MM-DD format.'),
    end_date: z.string().optional().describe('End date in YYYY-MM-DD format.'),
    exclude_total_leads_count: z.boolean().optional().describe('Exclude total leads count from the result to decrease response time.')
});

const CampaignAnalyticsSchema = z.object({
    campaign_name: z.string(),
    campaign_id: z.string(),
    campaign_status: z.number(),
    campaign_is_evergreen: z.boolean(),
    leads_count: z.number(),
    contacted_count: z.number(),
    emails_sent_count: z.number(),
    new_leads_contacted_count: z.number(),
    open_count: z.number(),
    open_count_unique: z.number().optional(),
    open_count_unique_by_step: z.number().optional(),
    reply_count: z.number(),
    reply_count_unique: z.number().optional(),
    reply_count_unique_by_step: z.number().optional(),
    reply_count_automatic: z.number().optional(),
    reply_count_automatic_unique: z.number().optional(),
    reply_count_automatic_unique_by_step: z.number().optional(),
    link_click_count: z.number(),
    link_click_count_unique: z.number().optional(),
    link_click_count_unique_by_step: z.number().optional(),
    bounced_count: z.number(),
    unsubscribed_count: z.number(),
    completed_count: z.number(),
    total_opportunities: z.number(),
    total_opportunity_value: z.number()
});

const OutputSchema = z.array(CampaignAnalyticsSchema);

const action = createAction({
    description: 'Get campaign analytics',
    endpoint: { method: 'GET', path: '/actions/get-campaign-analytics' },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['campaigns:read', 'all:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.instantly.ai/api-reference/campaign/get-campaigns-analytics
            endpoint: '/v2/campaigns/analytics',
            params: {
                ...(input.id !== undefined && { id: input.id }),
                ...(input.start_date !== undefined && { start_date: input.start_date }),
                ...(input.end_date !== undefined && { end_date: input.end_date }),
                ...(input.exclude_total_leads_count !== undefined && { exclude_total_leads_count: String(input.exclude_total_leads_count) })
            },
            retries: 3
        });

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
