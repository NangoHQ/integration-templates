import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        metric: z.string().min(1).describe('Comma-separated metric names to retrieve. Example: "reach,profile_views"'),
        period: z.enum(['day', 'week', 'days_28', 'month', 'lifetime', 'total_over_range']).describe('Aggregation period for the metrics. Example: "day"'),
        since: z.number().int().positive().optional().describe('Start of the time range as a Unix timestamp in seconds. Defaults to the last 24 hours.'),
        until: z.number().int().positive().optional().describe('End of the time range as a Unix timestamp in seconds. Defaults to the current time.'),
        timeframe: z
            .enum(['last_14_days', 'last_30_days', 'last_90_days', 'prev_month', 'this_month', 'this_week'])
            .optional()
            .describe('Preset timeframe required by demographic metrics. Overrides since and until for those metrics.'),
        metric_type: z
            .enum(['time_series', 'total_value'])
            .optional()
            .describe('How to aggregate results: "time_series" for values per period, or "total_value" for a single total with optional breakdowns.'),
        breakdown: z.string().min(1).optional().describe('Breakdown dimension for metrics that support it. Example: "media_product_type"'),
        breakdowns: z.string().min(1).optional().describe('Plural breakdown dimension used by demographic metrics. Example: "country"')
    })
    .describe('Input parameters for retrieving account-level insights for an Instagram business or creator account.');

const MetricValueSchema = z.object({
    value: z.number().optional().describe('Metric value for the period.'),
    end_time: z.string().optional().describe('End of the period in ISO 8601 format.')
});

const BreakdownResultSchema = z.object({
    dimension_values: z.array(z.string()).optional().describe('Values for each requested breakdown dimension.'),
    value: z.number().optional().describe('Metric value for this breakdown set.'),
    end_time: z.string().optional().describe('End of the period for this breakdown set in ISO 8601 format.')
});

const BreakdownSchema = z.object({
    dimension_keys: z.array(z.string()).optional().describe('Breakdown dimensions included in the results.'),
    results: z.array(BreakdownResultSchema).optional().describe('Results for each breakdown set.')
});

const TotalValueSchema = z.object({
    value: z.number().optional().describe('Total aggregated metric value across the requested range.'),
    breakdowns: z.array(BreakdownSchema).optional().describe('Breakdown results for the total value.')
});

const MetricSchema = z.object({
    name: z.string().describe('Metric name. Example: "reach"'),
    period: z.string().describe('Aggregation period returned for the metric. Example: "day"'),
    title: z.string().optional().describe('Human-readable metric title.'),
    description: z.string().optional().describe('Description of what the metric measures.'),
    id: z.string().optional().describe('Provider identifier for the metric query.'),
    values: z.array(MetricValueSchema).optional().describe('Values per period when using time-series aggregation.'),
    total_value: TotalValueSchema.optional().describe('Single total value when using total-value aggregation.')
});

const OutputSchema = z
    .object({
        data: z.array(MetricSchema).describe('Insights returned for each requested metric.'),
        paging: z
            .object({
                previous: z.string().optional().describe('URL for the previous page of results.'),
                next: z.string().optional().describe('URL for the next page of results.')
            })
            .optional()
            .describe('Pagination links when the provider returns them.')
    })
    .describe('Account-level insights returned for the requested metrics.');

/**
 * @tags: [read]
 * @tagReason: Reads account-level insights from the Instagram API without mutating provider data.
 * @pitfalls: Each metric supports only specific periods, some metrics require at least 100 followers, demographic metrics require a timeframe, data may be delayed up to 48 hours and is retained for only 90 days, and unavailable data returns an empty data array rather than zero.
 */
const action = createAction({
    description: 'Retrieve account-level insights for an Instagram business or creator account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['instagram_business_basic', 'instagram_business_manage_insights'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/insights
            endpoint: '/me/insights',
            params: {
                metric: input.metric,
                period: input.period,
                ...(input.since !== undefined && { since: input.since }),
                ...(input.until !== undefined && { until: input.until }),
                ...(input.timeframe !== undefined && { timeframe: input.timeframe }),
                ...(input.metric_type !== undefined && { metric_type: input.metric_type }),
                ...(input.breakdown !== undefined && { breakdown: input.breakdown }),
                ...(input.breakdowns !== undefined && { breakdowns: input.breakdowns })
            },
            retries: 3
        });

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
