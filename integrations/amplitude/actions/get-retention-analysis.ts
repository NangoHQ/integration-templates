import { z } from 'zod';
import { createAction } from 'nango';

const FilterSchema = z.object({
    subprop_type: z.string().describe('Property type: `event` or `user`.'),
    subprop_key: z.string().describe('Name of the property to filter on.'),
    subprop_op: z.string().describe('Filter operator, for example `is`, `contains`, `less`.'),
    subprop_value: z.array(z.string()).describe('Values to filter by.')
});

const GroupBySchema = z.object({
    type: z.string().describe('Property source: `event` or `user`.'),
    value: z.string().describe('Property name to group by.')
});

const EventSchema = z.object({
    event_type: z
        .string()
        .describe('Event type. Use `_active` for any active event, `_new` for new users, `ce:name` for custom events, or the raw event name.'),
    filters: z.array(FilterSchema).optional().describe('Optional property filters for the event.'),
    group_by: z.array(GroupBySchema).optional().describe('Optional group-by properties for the event.')
});

const SegmentSchema = z.object({
    prop: z.string().describe('Property name to filter on.'),
    op: z.string().describe('Filter operator.'),
    values: z.array(z.string()).describe('Values to filter the segment by.'),
    type: z.string().optional().describe('Set to `event` for "who performed" filters.'),
    event_type: z.string().optional().describe('Event type when using a "who performed" filter.'),
    filters: z.array(FilterSchema).optional().describe('Event property filters for "who performed" filters.'),
    value: z.number().optional().describe('Count threshold for "who performed" filters.'),
    time_type: z.string().optional().describe('Time window type: `forEachInterval`, `currentInterval`, or `allTime`.'),
    time_value: z.number().optional().describe('Number of days for the time window when `time_type` is `forEachInterval`.')
});

const InputSchema = z
    .object({
        startEvent: EventSchema.describe('The starting event that defines the retention cohort. Maps to the `se` query parameter.'),
        returnEvent: EventSchema.describe('The returning event that defines retention. Maps to the `re` query parameter.'),
        startDate: z.string().describe('First date in the data series, formatted as YYYYMMDD. Example: `20230101`.'),
        endDate: z.string().describe('Last date in the data series, formatted as YYYYMMDD. Example: `20230131`.'),
        retentionMode: z
            .enum(['n-day', 'rolling', 'bracket'])
            .optional()
            .describe('Retention calculation mode. Defaults to `n-day`. `rolling` implies unbounded retention.'),
        bracketBounds: z
            .string()
            .optional()
            .describe('Bracket bounds as a JSON array of day ranges. Required when `retentionMode` is `bracket`. Example: `[[0,4]]`.'),
        interval: z
            .union([z.literal(1), z.literal(7), z.literal(30)])
            .optional()
            .describe('Aggregation interval: 1 for daily, 7 for weekly, 30 for monthly. Defaults to 1.'),
        segment: z.array(SegmentSchema).optional().describe('User segment filters. Maps to the `s` query parameter.'),
        groupBy: z.string().optional().describe('Property to group results by. Example: `country` or `gp:utm_campaign`.')
    })
    .describe('Parameters for the retention analysis query.');

const RetentionDataPointSchema = z.object({
    count: z.number().describe('Number of users retained in the interval.'),
    outof: z.number().describe('Total number of users in the starting cohort.'),
    incomplete: z.boolean().describe('Whether the cohort has had enough time to mature for this interval.'),
    retainedSetId: z.string().nullable().optional().describe('Identifier for the retained user set, when available.')
});

const SeriesSchema = z.object({
    dates: z.array(z.string()).describe('Formatted date strings for each cohort, in descending order.'),
    values: z.record(z.string(), z.array(RetentionDataPointSchema)).describe('Retention data keyed by cohort date string.'),
    combined: z.array(RetentionDataPointSchema).describe('Aggregated retention data across all cohorts.')
});

const SeriesMetaSchema = z.object({
    segmentIndex: z.number().optional().describe('Index of the segment in the chart control panel.'),
    eventIndex: z.number().optional().describe('Index of the return event when multiple are selected.')
});

const OutputSchema = z
    .object({
        series: z.array(SeriesSchema).describe('Retention series, one element per segment.'),
        seriesMeta: z.array(SeriesMetaSchema).describe('Metadata labels for each segment and event combination.')
    })
    .describe('Retention analysis results from Amplitude.');

const ProviderResponseSchema = z.object({
    data: OutputSchema
});

/**
 * @tags: [read]
 * @tagReason: Retrieves computed retention analysis from Amplitude.
 * @pitfalls: Rate-limited by query cost (days x conditions x 8), capped at 108,000/hour and 1,000 per 5 minutes; large ranges may 429. The first element in each retention array is the cohort total; retention data starts at index 1. bracketBounds is required when retentionMode is bracket.
 */
const action = createAction({
    description: 'Get user retention between a starting action and a returning action.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {
            se: JSON.stringify(input.startEvent),
            re: JSON.stringify(input.returnEvent),
            start: input.startDate,
            end: input.endDate
        };

        if (input.retentionMode !== undefined) {
            params['rm'] = input.retentionMode;
        }

        if (input.bracketBounds !== undefined) {
            params['rb'] = input.bracketBounds;
        }

        if (input.interval !== undefined) {
            params['i'] = String(input.interval);
        }

        if (input.segment !== undefined) {
            params['s'] = JSON.stringify(input.segment);
        }

        if (input.groupBy !== undefined) {
            params['g'] = input.groupBy;
        }

        // https://amplitude.com/docs/apis/analytics/dashboard-rest
        const response = await nango.get({
            endpoint: '/api/2/retention',
            params,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        return parsed.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
