import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    metricSelector: z.string().describe('Metric selector expression. Example: "builtin:host.cpu.usage"'),
    resolution: z.string().optional().describe('Desired resolution of data points. Example: "1h" or "120"'),
    from: z.string().optional().describe('Start of the requested timeframe. Example: "now-2h" or "2021-01-25T05:57:01.123+01:00"'),
    to: z.string().optional().describe('End of the requested timeframe. Example: "now" or "2021-01-25T06:57:01.123+01:00"'),
    entitySelector: z.string().optional().describe('Entity scope of the query. Example: "type(HOST),entityId(HOST-123)"'),
    mzSelector: z.string().optional().describe('Management zone scope of the query. Example: "mzId(123),mzName("name")"')
});

const MetricSeriesSchema = z.object({
    dimensionMap: z.record(z.string(), z.string()).optional(),
    dimensions: z.array(z.string()).optional(),
    timestamps: z.array(z.number()).optional(),
    values: z.array(z.number().nullable()).optional()
});

const MetricSeriesCollectionSchema = z.object({
    metricId: z.string(),
    data: z.array(MetricSeriesSchema),
    dataPointCountRatio: z.number().optional(),
    dimensionCountRatio: z.number().optional(),
    warnings: z.array(z.string()).optional()
});

const OutputSchema = z.object({
    totalCount: z.number().optional(),
    nextPageKey: z.string().nullable().optional(),
    resolution: z.string().optional(),
    result: z.array(MetricSeriesCollectionSchema),
    warnings: z.array(z.string()).optional()
});

const action = createAction({
    description: 'Query time-series data points for one or more metrics.',
    version: '1.1.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['metrics.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.dynatrace.com/docs/dynatrace-api/environment-api/metric-v2/get-data-points
            endpoint: '/api/v2/metrics/query',
            params: {
                metricSelector: input.metricSelector,
                ...(input.resolution !== undefined && { resolution: input.resolution }),
                ...(input.from !== undefined && { from: input.from }),
                ...(input.to !== undefined && { to: input.to }),
                ...(input.entitySelector !== undefined && { entitySelector: input.entitySelector }),
                ...(input.mzSelector !== undefined && { mzSelector: input.mzSelector })
            },
            retries: 3
        });

        const metricData = OutputSchema.parse(response.data);

        return metricData;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
