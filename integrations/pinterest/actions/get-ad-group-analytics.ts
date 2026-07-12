import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    ad_account_id: z.string().describe('Unique identifier of an ad account. Example: "549770573673"'),
    ad_group_ids: z.array(z.string()).describe('List of Ad group Ids to use to filter the results.'),
    start_date: z.string().describe('Metric report start date (UTC). Format: YYYY-MM-DD.'),
    end_date: z.string().describe('Metric report end date (UTC). Format: YYYY-MM-DD.'),
    columns: z.array(z.string()).describe('Columns to retrieve as an array of metric names.'),
    granularity: z.enum(['TOTAL', 'DAY', 'HOUR', 'WEEK', 'MONTH']).describe('Granularity of the metrics.'),
    click_window_days: z.number().optional().describe('Number of days to use as the conversion attribution window for a pin click action.'),
    engagement_window_days: z.number().optional().describe('Number of days to use as the conversion attribution window for an engagement action.'),
    view_window_days: z.number().optional().describe('Number of days to use as the conversion attribution window for a view action.'),
    conversion_report_time: z
        .enum(['TIME_OF_AD_ACTION', 'TIME_OF_CONVERSION'])
        .optional()
        .describe('The date by which the conversion metrics returned from this endpoint will be reported.'),
    aggregate_report_rows: z.boolean().optional().describe('Determines if report rows should be aggregated across all requested entities.'),
    reporting_timezone: z.string().optional().describe('Specify the timezone to be applied for the reporting.')
});

const AnalyticsRowSchema = z
    .object({
        AD_GROUP_ID: z.string().optional(),
        DATE: z.string().optional()
    })
    .catchall(z.union([z.string(), z.number(), z.boolean(), z.null()]));

const OutputSchema = z.array(AnalyticsRowSchema);

const action = createAction({
    description: 'Get ad-group-level analytics.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {
            start_date: input.start_date,
            end_date: input.end_date,
            ad_group_ids: input.ad_group_ids.join(','),
            columns: input.columns.join(','),
            granularity: input.granularity,
            ...(input.click_window_days !== undefined && { click_window_days: input.click_window_days }),
            ...(input.engagement_window_days !== undefined && { engagement_window_days: input.engagement_window_days }),
            ...(input.view_window_days !== undefined && { view_window_days: input.view_window_days }),
            ...(input.conversion_report_time !== undefined && { conversion_report_time: input.conversion_report_time }),
            ...(input.aggregate_report_rows !== undefined && { aggregate_report_rows: String(input.aggregate_report_rows) }),
            ...(input.reporting_timezone !== undefined && { reporting_timezone: input.reporting_timezone })
        };

        const config: ProxyConfiguration = {
            // https://developers.pinterest.com/docs/api/v5/#operation/ad_groups/analytics
            endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}/ad_groups/analytics`,
            params,
            retries: 3
        };

        const response = await nango.get(config);

        if (!Array.isArray(response.data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected an array of analytics rows from the Pinterest API.',
                data: response.data
            });
        }

        const rows = response.data.map((row: unknown) => AnalyticsRowSchema.parse(row));
        return rows;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
