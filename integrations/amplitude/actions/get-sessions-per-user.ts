import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        start: z.string().describe('First date included in data series, formatted YYYYMMDD. Example: "20221001"'),
        end: z.string().describe('Last date included in data series, formatted YYYYMMDD. Example: "20221004"')
    })
    .describe('Input for getting the average number of sessions per user per day.');

const SegmentMetaSchema = z.union([
    z.string().describe('Segment label as a plain string.'),
    z
        .object({
            segmentIndex: z.number().optional().describe('Index of the segment, referring to its position in the chart control panel.')
        })
        .describe('Segment label as an object with index metadata.')
]);

const OutputSchema = z
    .object({
        series: z
            .array(z.array(z.number()))
            .describe('Array of arrays with the average number of sessions per user for each day, one inner array per segment.'),
        seriesMeta: z.array(SegmentMetaSchema).describe('Labels for each segment.'),
        xValues: z
            .array(z.string())
            .describe('Date strings for each date in the specified range. The live API returns ISO 8601 datetime strings such as "2025-09-23T00:00:00".')
    })
    .describe('Output containing average sessions per user data for the requested date range.');

const ProviderResponseSchema = z.object({
    data: z.object({
        series: z.array(z.array(z.number())),
        seriesMeta: z.array(z.union([z.string(), z.object({ segmentIndex: z.number().optional() })])).optional(),
        xValues: z.array(z.string())
    })
});

/**
 * @tags: [read]
 * @tagReason: Reads computed average sessions per user metrics from the Amplitude Dashboard REST API.
 * @pitfalls: Dates before the project's data retention cutoff return 403, and the query-cost rate limit scales with the requested range length (cost is 4 per day).
 */
const action = createAction({
    description: 'Get average number of sessions per user per day.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const hostname = connection.connection_config?.['hostname'];
        const baseUrlOverride = hostname === 'analytics.eu.amplitude.com' ? 'https://analytics.eu.amplitude.com' : undefined;

        // https://amplitude.com/docs/apis/analytics/dashboard-rest#get-average-sessions-per-user
        const response = await nango.get({
            endpoint: '/api/2/sessions/peruser',
            params: {
                start: input.start,
                end: input.end
            },
            baseUrlOverride,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            series: providerResponse.data.series,
            seriesMeta: providerResponse.data.seriesMeta ?? [],
            xValues: providerResponse.data.xValues
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
