import { z } from 'zod';
import { createAction } from 'nango';

const SegmentFilterSchema = z.object({
    subprop_type: z.string().describe('Either "event" or "user", indicating an event or user property filter.'),
    subprop_key: z.string().describe('Name of the property to filter on. For custom user properties, prepend with "gp:".'),
    subprop_op: z
        .string()
        .describe('Filter operator: is, is not, contains, does not contain, less, less or equal, greater, greater or equal, set is, or set is not.'),
    subprop_value: z.array(z.string()).describe('List of string values to filter the property by.')
});

const SegmentDefinitionSchema = z.object({
    prop: z.string().optional().describe('The name of the property to filter on. For behavioral cohorts, use "userdata_cohort".'),
    op: z
        .string()
        .optional()
        .describe('Filter operator: is, is not, contains, does not contain, less, less or equal, greater, greater or equal, set is, or set is not.'),
    values: z.array(z.string()).optional().describe('List of string values to filter the segment by.'),
    type: z.string().optional().describe('Set to "event" when using a "who performed" filter.'),
    event_type: z.string().optional().describe('The event to filter on when type is "event".'),
    filters: z.array(SegmentFilterSchema).optional().describe('Event property filters when using a "who performed" filter.'),
    value: z.number().optional().describe('Count threshold for the "who performed" filter.'),
    time_type: z.string().optional().describe('Time window type: forEachInterval, currentInterval, or allTime.'),
    time_value: z.number().optional().describe('Number of days for the time window when time_type is forEachInterval.')
});

const InputSchema = z
    .object({
        start: z.string().describe('First date included in the data series, formatted as YYYYMMDD. Example: "20221001".'),
        end: z.string().describe('Last date included in the data series, formatted as YYYYMMDD. Example: "20221001".'),
        m: z.enum(['active', 'new']).optional().describe('Metric to retrieve: "active" for active users or "new" for new users. Defaults to "active".'),
        i: z
            .union([z.literal(1), z.literal(7), z.literal(30)])
            .optional()
            .describe('Interval granularity: 1 for daily, 7 for weekly, or 30 for monthly counts. Defaults to 1.'),
        s: z
            .array(SegmentDefinitionSchema)
            .optional()
            .describe('Segment definitions to filter the user set. Each segment is a JSON object with filter conditions.'),
        g: z.string().optional().describe('Property to group results by, for example "platform" or "country". For custom user properties, prefix with "gp:".')
    })
    .describe('Input for retrieving active or new user counts over a date range.');

const OutputSchema = z
    .object({
        series: z.array(z.array(z.number())).describe('One inner array per group, containing the metric value for each date in xValues.'),
        seriesMeta: z
            .array(z.union([z.string(), z.object({ segmentIndex: z.number().describe('Zero-based index of the segment in the chart control panel.') })]))
            .describe('Labels for each segment or group in the same order as series.'),
        xValues: z.array(z.string()).describe('Date strings in YYYY-MM-DD format, one for each date in the requested range.')
    })
    .describe('Output containing active or new user counts over the requested date range.');

const ProviderResponseSchema = z.object({
    data: z.object({
        series: z.array(z.array(z.number())),
        seriesMeta: z.array(z.union([z.string(), z.object({ segmentIndex: z.number() })])).optional(),
        xValues: z.array(z.string())
    })
});

/**
 * @tags: [read]
 * @tagReason: Retrieves computed active or new user counts from Amplitude's Dashboard REST API.
 * @pitfalls: Requests are throttled by a query-cost model rather than a flat request count, so wide date ranges or complex segments can return 429 even at low call volume.
 */
const action = createAction({
    description: 'Get active or new user counts over a date range.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const hostname = connection.connection_config?.['hostname'];
        const baseUrlOverride = hostname === 'analytics.eu.amplitude.com' ? 'https://analytics.eu.amplitude.com' : undefined;

        const params: Record<string, string | number> = {
            start: input.start,
            end: input.end
        };

        if (input['m'] !== undefined) {
            params['m'] = input['m'];
        }

        if (input['i'] !== undefined) {
            params['i'] = input['i'];
        }

        if (input['s'] !== undefined && input['s'].length > 0) {
            params['s'] = JSON.stringify(input['s']);
        }

        if (input['g'] !== undefined) {
            params['g'] = input['g'];
        }

        // https://amplitude.com/docs/apis/analytics/dashboard-rest#get-active-and-new-user-counts
        const response = await nango.get({
            endpoint: '/api/2/users',
            params,
            baseUrlOverride,
            retries: 3
        });

        if (response.status === 429) {
            throw new nango.ActionError({
                type: 'rate_limited',
                message: 'Amplitude Dashboard REST API rate limit exceeded. The query-cost cap is 108,000 per hour and 1,000 per 5-minute window.'
            });
        }

        if (!response.data) {
            throw new nango.ActionError({
                type: 'no_data',
                message: 'No data returned from Amplitude for the requested date range.'
            });
        }

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            series: providerData.data.series,
            seriesMeta: providerData.data.seriesMeta ?? [],
            xValues: providerData.data.xValues
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
