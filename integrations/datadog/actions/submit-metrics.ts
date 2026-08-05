import { z } from 'zod';
import { createAction } from 'nango';

const PointSchema = z.object({
    timestamp: z.number().describe('Unix timestamp in seconds. Example: 1690000000'),
    value: z.number().describe('Metric value. Example: 42.5')
});

const SeriesSchema = z.object({
    metric: z.string().describe('Metric name. Example: "nango.registry.test.metric"'),
    type: z.union([z.literal(1), z.literal(2), z.literal(3)]).describe('Metric type: 1=count, 2=rate, 3=gauge'),
    points: z.array(PointSchema).describe('Data points for this metric'),
    tags: z.array(z.string()).optional().describe('Tags to associate with the metric. Example: ["env:prod"]')
});

const InputSchema = z.object({
    series: z.array(SeriesSchema).describe('Array of metric series to submit')
});

const ProviderResponseSchema = z.object({
    errors: z.array(z.string()).optional()
});

const OutputSchema = z.object({
    errors: z.array(z.string()).optional()
});

const action = createAction({
    description: 'Ingest custom metric data points',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.datadoghq.com/api/latest/metrics/#submit-metrics
            endpoint: 'v2/series',
            data: {
                series: input.series
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        return {
            ...(parsed.errors !== undefined && { errors: parsed.errors })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
