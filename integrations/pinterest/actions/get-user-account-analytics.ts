import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    start_date: z.string().describe('Metric report start date (UTC). Format: YYYY-MM-DD. Cannot be more than 90 days back from today.'),
    end_date: z.string().describe('Metric report end date (UTC). Format: YYYY-MM-DD. Cannot be more than 90 days past start_date.'),
    metric_types: z
        .array(
            z.enum(['ENGAGEMENT', 'ENGAGEMENT_RATE', 'IMPRESSION', 'OUTBOUND_CLICK', 'OUTBOUND_CLICK_RATE', 'PIN_CLICK', 'PIN_CLICK_RATE', 'SAVE', 'SAVE_RATE'])
        )
        .optional()
        .describe('Metric types to get data for. Default is all.'),
    app_types: z.enum(['ALL', 'MOBILE', 'TABLET', 'WEB']).optional().describe('Apps or devices to get data for. Default is all.'),
    split_field: z
        .enum(['NO_SPLIT', 'APP_TYPE', 'OWNED_CONTENT', 'SOURCE', 'PIN_FORMAT'])
        .optional()
        .describe('How to split the data into groups. Default is NO_SPLIT.')
});

const AnalyticsDailyMetricsSchema = z.object({
    data_status: z.string().optional(),
    date: z.string().optional(),
    metrics: z.record(z.string(), z.number()).optional()
});

const AnalyticsMetricsResponseSchema = z.object({
    daily_metrics: z.array(AnalyticsDailyMetricsSchema).optional(),
    summary_metrics: z.record(z.string(), z.number()).optional()
});

const OutputSchema = z.record(z.string(), AnalyticsMetricsResponseSchema);

const action = createAction({
    description: 'Get organic account analytics.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user_accounts:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {
            start_date: input.start_date,
            end_date: input.end_date
        };
        if (input.metric_types !== undefined) {
            params['metric_types'] = input.metric_types.join(',');
        }
        if (input.app_types !== undefined) {
            params['app_types'] = input.app_types;
        }
        if (input.split_field !== undefined) {
            params['split_field'] = input.split_field;
        }

        const response = await nango.get({
            // https://developers.pinterest.com/docs/api/v5/#operation/user_account/analytics
            endpoint: '/v5/user_account/analytics',
            params,
            retries: 3
        });

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
