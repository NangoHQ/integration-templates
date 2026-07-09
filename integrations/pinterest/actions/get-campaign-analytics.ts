import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ad_account_id: z.string().describe('Ad account ID. Example: "549770573673"'),
    campaign_ids: z.array(z.string()).describe('Campaign IDs to filter analytics by. Example: ["626759223935"]'),
    start_date: z.string().describe('Start date in YYYY-MM-DD format. Example: "2024-01-01"'),
    end_date: z.string().describe('End date in YYYY-MM-DD format. Example: "2024-01-31"'),
    columns: z.array(z.string()).describe('Analytics columns to return. Example: ["SPEND_IN_MICRO_DOLLAR", "IMPRESSION"]'),
    granularity: z.enum(['HOUR', 'DAY', 'WEEK', 'MONTH']).describe('Data aggregation level.'),
    click_window_days: z.number().optional().describe('Click attribution window in days.'),
    engagement_window_days: z.number().optional().describe('Engagement attribution window in days.'),
    view_window_days: z.number().optional().describe('View attribution window in days.'),
    conversion_report_time: z.enum(['TIME_OF_AD_ACTION', 'TIME_OF_CONVERSION']).optional().describe('When to report conversions.'),
    attribution_types: z.array(z.string()).optional().describe('Attribution types.')
});

const CampaignAnalyticsItemSchema = z.record(z.string(), z.unknown());

const OutputSchema = z.object({
    items: z.array(CampaignAnalyticsItemSchema)
});

const action = createAction({
    description: 'Get campaign-level analytics.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.pinterest.com/docs/api/v5/
            endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}/campaigns/analytics`,
            params: {
                start_date: input.start_date,
                end_date: input.end_date,
                campaign_ids: input.campaign_ids.join(','),
                columns: input.columns.join(','),
                granularity: input.granularity,
                ...(input.click_window_days !== undefined && { click_window_days: String(input.click_window_days) }),
                ...(input.engagement_window_days !== undefined && { engagement_window_days: String(input.engagement_window_days) }),
                ...(input.view_window_days !== undefined && { view_window_days: String(input.view_window_days) }),
                ...(input.conversion_report_time !== undefined && { conversion_report_time: input.conversion_report_time }),
                ...(input.attribution_types !== undefined && { attribution_types: input.attribution_types.join(',') })
            },
            retries: 3
        });

        const items = z.array(CampaignAnalyticsItemSchema).parse(response.data);

        return {
            items: items
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
