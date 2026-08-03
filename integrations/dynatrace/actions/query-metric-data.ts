import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    metricSelector: z.string().describe('Metric selector expression. Example: "builtin:host.cpu.usage"'),
    resolution: z.string().optional().describe('Time slot resolution. Example: "1h"'),
    from: z.string().optional().describe('Start of the timeframe. Example: "now-2h"'),
    to: z.string().optional().describe('End of the timeframe. Example: "now"'),
    entitySelector: z.string().optional().describe('Entity selector to filter data points. Example: "type(HOST)"')
});

const MetricDataPointSchema = z
    .object({
        dimensions: z.array(z.string()).optional(),
        dimensionMap: z.record(z.string(), z.string()).optional(),
        timestamps: z.array(z.number()).optional(),
        values: z.array(z.number().nullable()).optional()
    })
    .passthrough();

const AppliedFilterSchema = z
    .object({
        filter: z.string(),
        key: z.string()
    })
    .passthrough();

const MetricSeriesCollectionSchema = z
    .object({
        metricId: z.string(),
        dataPointCountRatio: z.number().optional(),
        dimensionCountRatio: z.number().optional(),
        data: z.array(MetricDataPointSchema).optional(),
        appliedOptionalFilters: z.array(AppliedFilterSchema).optional(),
        warnings: z.array(z.string()).optional()
    })
    .passthrough();

const OutputSchema = z.object({
    totalCount: z.number().optional(),
    nextPageKey: z.string().nullable().optional(),
    resolution: z.string().optional(),
    result: z.array(MetricSeriesCollectionSchema).optional(),
    warnings: z.array(z.string()).optional()
});

const action = createAction({
    description: 'Query time-series data points for one or more metrics',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['metrics.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {
            metricSelector: input.metricSelector
        };

        if (input.resolution !== undefined) {
            params['resolution'] = input.resolution;
        }

        if (input.from !== undefined) {
            params['from'] = input.from;
        }

        if (input.to !== undefined) {
            params['to'] = input.to;
        }

        if (input.entitySelector !== undefined) {
            params['entitySelector'] = input.entitySelector;
        }

        // https://docs.dynatrace.com/docs/dynatrace-api/environment-api/metric-v2/get-data-points
        const response = await nango.get({
            endpoint: '/api/v2/metrics/query',
            params,
            retries: 3
        });

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
