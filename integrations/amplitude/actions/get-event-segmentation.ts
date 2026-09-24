import { z } from 'zod';
import { createAction } from 'nango';

const EventFilterSchema = z.object({
    subprop_type: z.enum(['event', 'user']).describe('Type of property to filter on'),
    subprop_key: z.string().describe('Name of the property to filter on'),
    subprop_op: z.string().describe('Filter operator such as is, is not, contains, less, greater'),
    subprop_value: z.array(z.string()).describe('Values to filter the property by')
});

const GroupBySchema = z.object({
    type: z.enum(['event', 'user']).describe('Type of property to group by'),
    value: z.string().describe('Property name to group by')
});

const EventDefinitionSchema = z.object({
    event_type: z.string().describe('Event type name. Use _active for Any Active Event, _all for Any Event, or ce: prefix for custom events.'),
    filters: z.array(EventFilterSchema).optional().describe('Property filters to apply to the event'),
    group_by: z.array(GroupBySchema).optional().describe('Properties to group results by, up to 2')
});

const SegmentDefinitionSchema = z.object({
    prop: z.string().describe('Name of the property or behavior to filter on'),
    op: z.string().describe('Filter operator such as is, is not, contains, less, greater'),
    values: z.array(z.string()).describe('Values to filter the segment by'),
    type: z.string().optional().describe('Set to event when using a who-performed filter'),
    event_type: z.string().optional().describe('Event type for who-performed filters'),
    filters: z.array(z.unknown()).optional().describe('Event property filters for who-performed filters'),
    value: z.number().optional().describe('Count threshold for who-performed filter'),
    time_type: z.string().optional().describe('Time window type: forEachInterval, currentInterval, or allTime'),
    time_value: z.number().optional().describe('Number of days for the time window when time_type equals forEachInterval')
});

const SeriesCollapsedItemSchema = z.object({
    value: z.number().describe('Collapsed metric value for the group')
});

const InputSchema = z
    .object({
        e: EventDefinitionSchema.describe('Primary event definition to query metrics for'),
        e2: EventDefinitionSchema.optional().describe('Second event definition for comparison'),
        start: z.string().describe('First date in the range formatted as YYYYMMDD'),
        end: z.string().describe('Last date in the range formatted as YYYYMMDD'),
        m: z
            .enum(['uniques', 'totals', 'pct_dau', 'average', 'histogram', 'sums', 'value_avg', 'formula'])
            .optional()
            .describe('Metric type. Defaults to uniques.'),
        i: z.number().optional().describe('Interval: -300000 for real-time, -3600000 for hourly, 1 for daily, 7 for weekly, 30 for monthly. Defaults to 1.'),
        s: z.array(SegmentDefinitionSchema).optional().describe('Segment definitions to filter users'),
        g: z.string().optional().describe('Property to group by. For custom user properties use gp: prefix.'),
        n: z.enum(['any', 'active']).optional().describe('User type to consider: any or active'),
        limit: z.number().optional().describe('Maximum number of group-by values to return. Default 100, max 1000.'),
        formula: z.string().optional().describe('Custom formula when m is set to formula, e.g. UNIQUES(A)/UNIQUES(B)'),
        rollingWindow: z.number().optional().describe('Number of days, weeks, or months for a rolling window'),
        rollingAverage: z.number().optional().describe('Number of days, weeks, or months for a rolling average')
    })
    .describe('Input for querying Amplitude event segmentation metrics');

const OutputSchema = z
    .object({
        data: z
            .object({
                series: z.array(z.array(z.number())).describe('Metric values for each group and date in xValues'),
                seriesLabels: z.array(z.string()).optional().describe('Labels for each group in series'),
                seriesCollapsed: z
                    .array(z.array(SeriesCollapsedItemSchema))
                    .optional()
                    .describe('Collapsed bar-chart values representing total unique users over the interval'),
                xValues: z.array(z.string()).describe('Date strings in YYYY-MM-DD format, one for each date in the range')
            })
            .describe('Event segmentation result data')
    })
    .describe('Response from the Amplitude event segmentation endpoint');

/**
 * @tags: [read]
 * @tagReason: Queries computed event metrics from Amplitude. No provider state is modified.
 * @pitfalls: Rate limiting uses a query-cost model (cost = days * conditions * query-type cost) and may return 429. Real-time and hourly intervals are capped at 2 and 7 days respectively; daily is capped at 365 days. Property metrics require group_by in the event definition and group-by is only available with a single segment.
 */
const action = createAction({
    description: 'Query event metrics with segmentation, optionally comparing up to two events.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const queryParams: string[] = [];
        queryParams.push(`e=${encodeURIComponent(JSON.stringify(input.e))}`);
        queryParams.push(`start=${encodeURIComponent(input.start)}`);
        queryParams.push(`end=${encodeURIComponent(input.end)}`);

        if (input.e2 !== undefined) {
            queryParams.push(`e2=${encodeURIComponent(JSON.stringify(input.e2))}`);
        }
        if (input.m !== undefined) {
            queryParams.push(`m=${encodeURIComponent(input.m)}`);
        }
        if (input.i !== undefined) {
            queryParams.push(`i=${encodeURIComponent(String(input.i))}`);
        }
        if (input.s !== undefined) {
            queryParams.push(`s=${encodeURIComponent(JSON.stringify(input.s))}`);
        }
        if (input.g !== undefined) {
            queryParams.push(`g=${encodeURIComponent(input.g)}`);
        }
        if (input.n !== undefined) {
            queryParams.push(`n=${encodeURIComponent(input.n)}`);
        }
        if (input.limit !== undefined) {
            queryParams.push(`limit=${encodeURIComponent(String(input.limit))}`);
        }
        if (input.formula !== undefined) {
            queryParams.push(`formula=${encodeURIComponent(input.formula)}`);
        }
        if (input.rollingWindow !== undefined) {
            queryParams.push(`rollingWindow=${encodeURIComponent(String(input.rollingWindow))}`);
        }
        if (input.rollingAverage !== undefined) {
            queryParams.push(`rollingAverage=${encodeURIComponent(String(input.rollingAverage))}`);
        }

        const endpoint = `/api/2/events/segmentation?${queryParams.join('&')}`;

        // https://amplitude.com/docs/apis/analytics/dashboard-rest
        const response = await nango.get({
            endpoint,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'empty_response',
                message: 'Amplitude returned an empty response'
            });
        }

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
