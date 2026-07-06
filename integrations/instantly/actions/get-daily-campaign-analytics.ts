import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    campaign_id: z
        .string()
        .optional()
        .describe('Campaign ID (optional). Leave empty to get analytics for all campaigns. Example: "019f1a45-a5dd-763f-898f-a14b87db8b35"'),
    start_date: z.string().optional().describe('Start date in YYYY-MM-DD format. Example: "2024-01-01"'),
    end_date: z.string().optional().describe('End date in YYYY-MM-DD format. Example: "2024-01-01"'),
    campaign_status: z
        .number()
        .optional()
        .describe(
            'Filter by campaign status. 0 = Draft, 1 = Active, 2 = Paused, 3 = Completed, 4 = Running Subsequences, -99 = Account Suspended, -1 = Accounts Unhealthy, -2 = Bounce Protect.'
        )
});

const DailyCampaignAnalyticsSchema = z.object({
    date: z.string().describe('The date of the analytics entry, in YYYY-MM-DD format.'),
    sent: z.number().describe('The total number of sent emails.').optional(),
    contacted: z.number().describe('The total number of unique contacts who received an email that day.').optional(),
    new_leads_contacted: z.number().describe('The total number of new leads contacted that day.').optional(),
    opened: z.number().describe('The total number of opened emails.').optional(),
    unique_opened: z.number().describe('The total number of unique opened emails.').optional(),
    replies: z.number().describe('The total number of replies.').optional(),
    unique_replies: z.number().describe('The total number of unique replies.').optional(),
    replies_automatic: z.number().describe('The total number of automatic replies detected.').optional(),
    unique_replies_automatic: z.number().describe('The total number of unique automatic replies detected.').optional(),
    clicks: z.number().describe('The total number of links clicked.').optional(),
    unique_clicks: z.number().describe('The total number of unique links clicked.').optional(),
    opportunities: z.number().describe('The total number of unique opportunities created from the campaign on that day.').optional(),
    unique_opportunities: z.number().describe('The total number of unique opportunities created from unique leads from the campaign on that day.').optional()
});

const OutputSchema = z.array(DailyCampaignAnalyticsSchema);

const action = createAction({
    description: 'Get daily campaign analytics.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['campaigns:read', 'campaigns:all', 'all:read', 'all:all'],
    endpoint: {
        path: '/actions/get-daily-campaign-analytics',
        method: 'GET'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.instantly.ai/api-reference/campaign/get-daily-campaign-analytics
            endpoint: '/v2/campaigns/analytics/daily',
            params: {
                ...(input.campaign_id !== undefined && { campaign_id: input.campaign_id }),
                ...(input.start_date !== undefined && { start_date: input.start_date }),
                ...(input.end_date !== undefined && { end_date: input.end_date }),
                ...(input.campaign_status !== undefined && { campaign_status: String(input.campaign_status) })
            },
            retries: 3
        });

        const parsed = z.array(DailyCampaignAnalyticsSchema).parse(response.data);

        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
