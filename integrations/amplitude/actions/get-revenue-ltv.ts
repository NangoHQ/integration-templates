import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        start: z.string().describe('First date included in the data series, formatted as YYYYMMDD. Example: "20221001".'),
        end: z.string().describe('Last date included in the data series, formatted as YYYYMMDD. Example: "20221001".'),
        metric: z
            .union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)])
            .optional()
            .describe('Metric type: 0 = ARPU, 1 = ARPPU, 2 = Total Revenue, 3 = Paying Users. Defaults to 0.'),
        interval: z
            .union([z.literal(1), z.literal(7), z.literal(30)])
            .optional()
            .describe('Aggregation interval in days: 1 = daily, 7 = weekly, 30 = monthly. Defaults to 1.'),
        segment: z.array(z.object({}).passthrough()).optional().describe('Segment definitions as a JSON array of filter objects. Defaults to none.'),
        group_by: z.string().optional().describe('Property to group by, for example "platform" or "gp:utm_campaign". Limit: one group.')
    })
    .describe('Input parameters for retrieving revenue LTV metrics.');

const ProviderResponseSchema = z.object({
    data: z.object({
        seriesLabels: z.array(z.unknown()),
        series: z.array(
            z.object({
                dates: z.array(z.unknown()),
                values: z.record(
                    z.string(),
                    z
                        .object({
                            count: z.number().optional(),
                            paid: z.number().optional(),
                            total_amount: z.number().optional()
                        })
                        .passthrough()
                )
            })
        )
    })
});

const LtvValueSchema = z
    .object({
        count: z.number().optional().describe('Total number of users in the cohort.'),
        paid: z.number().optional().describe('Number of paid users in the cohort.'),
        total_amount: z.number().optional().describe('Total amount paid by users in the cohort.')
    })
    .passthrough()
    .describe('Per-cohort LTV metrics including dynamic r1d through r90d fields.');

const RevenueLtvSeriesSchema = z
    .object({
        dates: z.array(z.string()).describe('Array of formatted date strings in descending order, one per date in the range.'),
        values: z
            .record(z.string(), LtvValueSchema)
            .describe('Map of date strings to LTV metric objects containing r1d through r90d, count, paid, and total_amount.')
    })
    .describe('A single series of LTV data with dates and per-date values.');

const OutputSchema = z
    .object({
        seriesLabels: z.array(z.string()).describe('Labels for each group or segment in the series.'),
        series: z.array(RevenueLtvSeriesSchema).describe('Array of LTV data series, one per group or segment.')
    })
    .describe('Revenue lifetime value metrics for new users over the requested date range.');

/**
 * @tags: [read]
 * @tagReason: Reads computed revenue LTV metrics from the Amplitude Dashboard REST API.
 * @pitfalls: Response dates and value keys use abbreviated-month-day format like 'Sep 18' rather than YYYY-MM-DD, and values objects include many more day-based and new-user-based fields than the documented r1d–r90d range. This endpoint uses a query-cost rate limit where cost equals days times conditions times query-type cost; large ranges or segments can exhaust the 1,000 cost per 5-minute cap and return 429.
 */
const action = createAction({
    description: 'Get lifetime value metrics for new users over a date range.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const hostname = connection.connection_config?.['hostname'];
        const baseUrlOverride = hostname === 'analytics.eu.amplitude.com' ? 'https://analytics.eu.amplitude.com' : undefined;

        const params: Record<string, string> = {
            start: input.start,
            end: input.end
        };

        if (input.metric !== undefined) {
            params['m'] = String(input.metric);
        }
        if (input.interval !== undefined) {
            params['i'] = String(input.interval);
        }
        if (input.segment !== undefined) {
            params['s'] = JSON.stringify(input.segment);
        }
        if (input.group_by !== undefined) {
            params['g'] = input.group_by;
        }

        // https://amplitude.com/docs/apis/analytics/dashboard-rest
        const response = await nango.get({
            endpoint: '/api/2/revenue/ltv',
            params,
            baseUrlOverride,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            seriesLabels: parsed.data.seriesLabels.map((label) => String(label)),
            series: parsed.data.series.map((s) => ({
                dates: s.dates.map((date) => String(date)),
                values: s.values
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
