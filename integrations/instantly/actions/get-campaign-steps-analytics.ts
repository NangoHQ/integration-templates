import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    campaign_id: z.string().optional().describe('Campaign ID. Example: "019f1a45-a5de-7ccc-a006-653e170503f4"'),
    start_date: z.string().optional().describe('Start date. Example: "2024-01-01"'),
    end_date: z.string().optional().describe('End date. Example: "2024-01-01"'),
    include_opportunities_count: z.boolean().optional().describe('Whether to include opportunities count per step')
});

const StepAnalyticsSchema = z.object({
    step: z.string().nullable(),
    variant: z.string().nullable(),
    sent: z.number(),
    opened: z.number(),
    unique_opened: z.number(),
    replies: z.number(),
    unique_replies: z.number(),
    replies_automatic: z.number(),
    unique_replies_automatic: z.number(),
    clicks: z.number(),
    unique_clicks: z.number(),
    opportunities: z.number().optional(),
    unique_opportunities: z.number().optional()
});

const OutputSchema = z.object({
    steps: z.array(StepAnalyticsSchema)
});

const action = createAction({
    description: 'Get per-step analytics for a campaign.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: {
        path: '/actions/get-campaign-steps-analytics',
        method: 'GET'
    },
    scopes: ['campaigns:read', 'all:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developer.instantly.ai/api-reference/campaign/get-campaign-steps-analytics
            endpoint: '/v2/campaigns/analytics/steps',
            params: {
                ...(input.campaign_id !== undefined && { campaign_id: input.campaign_id }),
                ...(input.start_date !== undefined && { start_date: input.start_date }),
                ...(input.end_date !== undefined && { end_date: input.end_date }),
                ...(input.include_opportunities_count !== undefined && { include_opportunities_count: String(input.include_opportunities_count) })
            },
            retries: 3
        };

        const response = await nango.get(config);

        if (!Array.isArray(response.data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected an array of step analytics from the Instantly API.'
            });
        }

        const steps = response.data.map((item: unknown) => {
            const parsed = StepAnalyticsSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Failed to parse step analytics item.',
                    details: parsed.error.issues
                });
            }
            return parsed.data;
        });

        return { steps };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
