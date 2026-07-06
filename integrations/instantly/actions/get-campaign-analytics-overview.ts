import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z
        .string()
        .uuid()
        .optional()
        .describe(
            'A campaign ID to get the analytics overview for. Leave empty to get analytics for all campaigns. Example: "019f1a45-a5db-793c-a016-562d70d931a0"'
        ),
    ids: z
        .array(z.string().uuid())
        .optional()
        .describe('A list of campaign IDs to get the analytics overview for. Leave empty to get analytics for all campaigns.'),
    start_date: z.string().optional().describe('Start date filter in YYYY-MM-DD format. Example: "2024-01-01"'),
    end_date: z.string().optional().describe('End date filter in YYYY-MM-DD format. Example: "2024-01-01"'),
    campaign_status: z
        .number()
        .optional()
        .describe(
            'Filter by campaign status. Values: -99 (Account Suspended), -1 (Accounts Unhealthy), -2 (Bounce Protect), 0 (Draft), 1 (Active), 2 (Paused), 3 (Completed), 4 (Running Subsequences).'
        ),
    expand_crm_events: z
        .boolean()
        .optional()
        .describe('When true, calculates totals based on all occurrences of lead interest status events instead of only the first occurrence per contact.')
});

const ProviderOutputSchema = z.object({
    open_count: z.number().optional(),
    open_count_unique: z.number().optional(),
    open_count_unique_by_step: z.number().optional(),
    link_click_count: z.number().optional(),
    link_click_count_unique: z.number().optional(),
    link_click_count_unique_by_step: z.number().optional(),
    reply_count: z.number().optional(),
    reply_count_unique: z.number().optional(),
    reply_count_unique_by_step: z.number().optional(),
    reply_count_automatic: z.number().optional(),
    reply_count_automatic_unique: z.number().optional(),
    reply_count_automatic_unique_by_step: z.number().optional(),
    bounced_count: z.number().optional(),
    unsubscribed_count: z.number().optional(),
    completed_count: z.number().optional(),
    emails_sent_count: z.number().optional(),
    contacted_count: z.number().optional(),
    new_leads_contacted_count: z.number().optional(),
    total_opportunities: z.number().optional(),
    total_opportunity_value: z.number().optional(),
    total_interested: z.number().optional(),
    total_meeting_booked: z.number().optional(),
    total_meeting_completed: z.number().optional(),
    total_closed: z.number().optional()
});

const OutputSchema = ProviderOutputSchema;

const action = createAction({
    description: 'Get campaign analytics overview.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: {
        path: '/actions/get-campaign-analytics-overview',
        method: 'GET'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.instantly.ai/api-reference/campaign/get-campaigns-analytics-overview.md
            endpoint: '/v2/campaigns/analytics/overview',
            params: {
                ...(input.id !== undefined && { id: input.id }),
                ...(input.ids !== undefined && input.ids.length > 0 && { ids: input.ids }),
                ...(input.start_date !== undefined && { start_date: input.start_date }),
                ...(input.end_date !== undefined && { end_date: input.end_date }),
                ...(input.campaign_status !== undefined && { campaign_status: input.campaign_status }),
                ...(input.expand_crm_events !== undefined && { expand_crm_events: String(input.expand_crm_events) })
            },
            retries: 3
        });

        const overview = ProviderOutputSchema.parse(response.data);

        return overview;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
