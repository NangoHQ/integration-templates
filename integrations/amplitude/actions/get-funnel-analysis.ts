import { z } from 'zod';
import { createAction } from 'nango';

const FilterSchema = z.object({
    subprop_type: z.string().describe('Either event or user, indicating an event or user property.'),
    subprop_key: z.string().describe('The name of the property to filter on.'),
    subprop_op: z.string().describe('The filter operator.'),
    subprop_value: z.array(z.string()).describe('A list of values to filter the event property by.')
});

const GroupBySchema = z.object({
    type: z.enum(['event', 'user']).describe('Either event or user.'),
    value: z.string().describe('The property name.')
});

const EventDefinitionSchema = z.object({
    event_type: z.string().describe('The event type. For custom events, prefix with ce:. For Any Active Event, use _active. For Any Event, use _all.'),
    filters: z.array(FilterSchema).optional().describe('A list of property filters.'),
    group_by: z.array(GroupBySchema).optional().describe('A list of properties to group by (at most 2).')
});

const SegmentDefinitionSchema = z.object({
    prop: z.string().describe('The name of the property to filter on.'),
    op: z.string().describe('The filter operator.'),
    values: z.array(z.string()).describe('A list of strings to filter the segment by.'),
    type: z.string().optional().describe('Set to event when using a who performed filter.'),
    event_type: z.string().optional().describe('The event to filter on when using a who performed filter.'),
    filters: z.array(FilterSchema).optional().describe('Event property filters when using a who performed filter.'),
    value: z.number().optional().describe('The count threshold for the who performed filter.'),
    time_type: z.string().optional().describe('Time window type for the who performed filter.'),
    time_value: z.number().optional().describe('Number of days for the time window when time_type equals forEachInterval.')
});

const InputSchema = z
    .object({
        events: z.array(EventDefinitionSchema).min(2).describe('A list of event definitions for each funnel step. At least 2 steps are required.'),
        start: z.string().describe('First date included in data series, formatted YYYYMMDD. For example, 20221001.'),
        end: z.string().describe('Last date included in data series, formatted YYYYMMDD. For example, 20221001.'),
        mode: z
            .enum(['ordered', 'unordered', 'sequential'])
            .optional()
            .describe(
                'The mode to run the funnel in: ordered for events in the given order, unordered for events in any order, and sequential for events in the given order with no other events between.'
            ),
        cs: z.number().optional().describe('The conversion window in seconds. Defaults to 2592000 (30 days).'),
        n: z.enum(['new', 'active']).optional().describe('Either new or active to specify which set of users to consider in the funnel.'),
        s: z.array(SegmentDefinitionSchema).optional().describe('Segment definitions to filter users based on their properties or behaviors.'),
        g: z.string().optional().describe('The property to group by. For non-Amplitude custom user properties, prepend with gp:.'),
        limit: z.number().optional().describe('The number of Group By values returned. Defaults to 100. The maximum is 1000.'),
        i: z.number().optional().describe('Set to -300000, -3600000, 1, 7, or 30 for real-time, hourly, daily, weekly, and monthly counts, respectively.')
    })
    .describe('Input for querying funnel drop-off and conversion rates across a sequence of events.');

const BinSchema = z.object({
    start: z.number().optional(),
    end: z.number().optional(),
    bin_dist: z.number().optional()
});

const HistogramSchema = z.object({
    bins: z.array(BinSchema).optional()
});

const TimeSeriesSchema = z.object({
    series: z.array(z.array(z.number())).optional(),
    xValues: z.array(z.string()).optional(),
    formattedXValues: z.array(z.string()).optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(
        z.object({
            meta: z
                .object({
                    segmentIndex: z.number().optional()
                })
                .optional(),
            stepTransTimeDistribution: z.array(HistogramSchema).optional(),
            stepPrevStepCountDistribution: z.array(HistogramSchema).optional(),
            dayMedianTransTimes: TimeSeriesSchema.optional(),
            dayAvgTransTimes: TimeSeriesSchema.optional(),
            stepByStep: z.array(z.number()).optional(),
            medianTransTimes: z.array(z.number()).optional(),
            cumulative: z.array(z.number()).optional(),
            cumulativeRaw: z.array(z.number()).optional(),
            avgTransTimes: z.array(z.number()).optional(),
            dayFunnels: TimeSeriesSchema.optional(),
            events: z.array(z.string()).optional()
        })
    )
});

const OutputSchema = z
    .object({
        results: z
            .array(
                z.object({
                    meta: z
                        .object({
                            segmentIndex: z.number().optional().describe('The index of the segment in the right module of the chart control panel.')
                        })
                        .optional()
                        .describe('Metadata about the segment.'),
                    stepTransTimeDistribution: z
                        .array(
                            z
                                .object({
                                    bins: z
                                        .array(
                                            z
                                                .object({
                                                    start: z.number().optional().describe('The start of the histogram bin.'),
                                                    end: z.number().optional().describe('The end of the histogram bin.'),
                                                    bin_dist: z.number().optional().describe('The users, count, or propsum for that bin.')
                                                })
                                                .optional()
                                        )
                                        .optional()
                                        .describe('Histogram bins for this step.')
                                })
                                .optional()
                        )
                        .optional()
                        .describe('Histogram data for each step showing how long it took users to convert through that step.'),
                    stepPrevStepCountDistribution: z
                        .array(
                            z
                                .object({
                                    bins: z
                                        .array(
                                            z
                                                .object({
                                                    start: z.number().optional().describe('The start of the histogram bin.'),
                                                    end: z.number().optional().describe('The end of the histogram bin.'),
                                                    bin_dist: z.number().optional().describe('The users, count, or propsum for that bin.')
                                                })
                                                .optional()
                                        )
                                        .optional()
                                        .describe('Histogram bins for this step.')
                                })
                                .optional()
                        )
                        .optional()
                        .describe('Histogram data for each step showing how many times users performed the previous step.'),
                    dayMedianTransTimes: z
                        .object({
                            series: z
                                .array(z.array(z.number()))
                                .optional()
                                .describe('An array with one element per group, each an array of median transition times in milliseconds for each day.'),
                            xValues: z.array(z.string()).optional().describe('Date strings in YYYY-MM-DD format.'),
                            formattedXValues: z.array(z.string()).optional().describe('Date strings in Month DD format.')
                        })
                        .optional()
                        .describe('Median transition times by day between steps.'),
                    dayAvgTransTimes: z
                        .object({
                            series: z
                                .array(z.array(z.number()))
                                .optional()
                                .describe('An array with one element per group, each an array of average transition times in milliseconds for each day.'),
                            xValues: z.array(z.string()).optional().describe('Date strings in YYYY-MM-DD format.'),
                            formattedXValues: z.array(z.string()).optional().describe('Date strings in Month DD format.')
                        })
                        .optional()
                        .describe('Average transition times by day between steps.'),
                    stepByStep: z
                        .array(z.number())
                        .optional()
                        .describe(
                            'An array with one element per funnel step, indicating the fraction of users from the previous step who completed that step.'
                        ),
                    medianTransTimes: z
                        .array(z.number())
                        .optional()
                        .describe('An array with one element per funnel step, indicating the median transition time between steps in milliseconds.'),
                    cumulative: z
                        .array(z.number())
                        .optional()
                        .describe('An array with one element per funnel step, indicating the fraction of total users who completed that step.'),
                    cumulativeRaw: z
                        .array(z.number())
                        .optional()
                        .describe('An array with one element per funnel step, indicating the number of users who completed that step.'),
                    avgTransTimes: z
                        .array(z.number())
                        .optional()
                        .describe('An array with one element per funnel step, indicating the average transition time between steps in milliseconds.'),
                    dayFunnels: z
                        .object({
                            series: z
                                .array(z.array(z.number()))
                                .optional()
                                .describe('An array with one element per group, each an array of user counts for each interval.'),
                            xValues: z.array(z.string()).optional().describe('Date strings in YYYY-MM-DD format.'),
                            formattedXValues: z.array(z.string()).optional().describe('Date strings in Month DD format.')
                        })
                        .optional()
                        .describe('The number of users who completed each funnel step by day.'),
                    events: z.array(z.string()).optional().describe('Labels for each event in the funnel.')
                })
            )
            .describe('An array of funnel analysis results, one per group.')
    })
    .describe('Funnel analysis output containing drop-off, conversion, and timing data per group.');

/**
 * @tags: [read]
 * @tagReason: Reads funnel analysis data from the Amplitude Dashboard REST API.
 * @pitfalls: Dates must be YYYYMMDD rather than ISO 8601, unordered mode rounds conversion windows down to the nearest day, and requests are throttled by a query-cost model rather than a flat request count.
 */
const action = createAction({
    description: 'Get funnel drop-off and conversion rates across a sequence of events.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        const ConnectionConfigSchema = z.object({
            hostname: z.string().optional()
        });
        const parsedConfig = ConnectionConfigSchema.parse(connection.connection_config || {});
        const hostname = parsedConfig.hostname || 'amplitude.com';
        const baseUrlOverride = hostname === 'amplitude.com' ? undefined : `https://${hostname}`;

        const params: Record<string, string> = {
            start: input['start'],
            end: input['end']
        };

        input['events'].forEach((event, index) => {
            const key = index === 0 ? 'e' : `e${index + 1}`;
            params[key] = JSON.stringify(event);
        });

        if (input['mode'] !== undefined) {
            params['mode'] = input['mode'];
        }

        if (input['cs'] !== undefined) {
            params['cs'] = String(input['cs']);
        }

        if (input['n'] !== undefined) {
            params['n'] = input['n'];
        }

        if (input['s'] !== undefined) {
            params['s'] = JSON.stringify(input['s']);
        }

        if (input['g'] !== undefined) {
            params['g'] = input['g'];
        }

        if (input['limit'] !== undefined) {
            params['limit'] = String(input['limit']);
        }

        if (input['i'] !== undefined) {
            params['i'] = String(input['i']);
        }

        // https://amplitude.com/docs/apis/analytics/dashboard-rest
        const response = await nango.get({
            endpoint: '/api/2/funnels',
            params,
            retries: 3,
            ...(baseUrlOverride && { baseUrlOverride })
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            results: providerResponse.data.map((item) => ({
                ...(item.meta !== undefined && {
                    meta: {
                        ...(item.meta.segmentIndex !== undefined && { segmentIndex: item.meta.segmentIndex })
                    }
                }),
                ...(item.stepTransTimeDistribution !== undefined && {
                    stepTransTimeDistribution: item.stepTransTimeDistribution.map((dist) => ({
                        ...(dist.bins !== undefined && {
                            bins: dist.bins.map((bin) => ({
                                ...(bin.start !== undefined && { start: bin.start }),
                                ...(bin.end !== undefined && { end: bin.end }),
                                ...(bin.bin_dist !== undefined && { bin_dist: bin.bin_dist })
                            }))
                        })
                    }))
                }),
                ...(item.stepPrevStepCountDistribution !== undefined && {
                    stepPrevStepCountDistribution: item.stepPrevStepCountDistribution.map((dist) => ({
                        ...(dist.bins !== undefined && {
                            bins: dist.bins.map((bin) => ({
                                ...(bin.start !== undefined && { start: bin.start }),
                                ...(bin.end !== undefined && { end: bin.end }),
                                ...(bin.bin_dist !== undefined && { bin_dist: bin.bin_dist })
                            }))
                        })
                    }))
                }),
                ...(item.dayMedianTransTimes !== undefined && {
                    dayMedianTransTimes: {
                        ...(item.dayMedianTransTimes.series !== undefined && { series: item.dayMedianTransTimes.series }),
                        ...(item.dayMedianTransTimes.xValues !== undefined && { xValues: item.dayMedianTransTimes.xValues }),
                        ...(item.dayMedianTransTimes.formattedXValues !== undefined && { formattedXValues: item.dayMedianTransTimes.formattedXValues })
                    }
                }),
                ...(item.dayAvgTransTimes !== undefined && {
                    dayAvgTransTimes: {
                        ...(item.dayAvgTransTimes.series !== undefined && { series: item.dayAvgTransTimes.series }),
                        ...(item.dayAvgTransTimes.xValues !== undefined && { xValues: item.dayAvgTransTimes.xValues }),
                        ...(item.dayAvgTransTimes.formattedXValues !== undefined && { formattedXValues: item.dayAvgTransTimes.formattedXValues })
                    }
                }),
                ...(item.stepByStep !== undefined && { stepByStep: item.stepByStep }),
                ...(item.medianTransTimes !== undefined && { medianTransTimes: item.medianTransTimes }),
                ...(item.cumulative !== undefined && { cumulative: item.cumulative }),
                ...(item.cumulativeRaw !== undefined && { cumulativeRaw: item.cumulativeRaw }),
                ...(item.avgTransTimes !== undefined && { avgTransTimes: item.avgTransTimes }),
                ...(item.dayFunnels !== undefined && {
                    dayFunnels: {
                        ...(item.dayFunnels.series !== undefined && { series: item.dayFunnels.series }),
                        ...(item.dayFunnels.xValues !== undefined && { xValues: item.dayFunnels.xValues }),
                        ...(item.dayFunnels.formattedXValues !== undefined && { formattedXValues: item.dayFunnels.formattedXValues })
                    }
                }),
                ...(item.events !== undefined && { events: item.events })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
