import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    metricKey: z.string().describe('The key of the metric to describe. Example: "builtin:host.cpu.usage"')
});

const MetricDefaultAggregationSchema = z.object({
    type: z.string().optional(),
    parameter: z.number().optional()
});

const MetricDimensionDefinitionSchema = z.object({
    key: z.string(),
    name: z.string().optional(),
    displayName: z.string().optional(),
    index: z.number().optional(),
    type: z.string().optional()
});

const MetricDimensionCardinalitySchema = z.object({
    key: z.string(),
    estimate: z.number(),
    relative: z.number()
});

const MetricValueTypeSchema = z.object({
    type: z.string().optional()
});

const MetricDescriptorSchema = z.object({
    metricId: z.string(),
    displayName: z.string().optional(),
    description: z.string().optional(),
    unit: z.string().optional(),
    entityType: z.array(z.string()).optional(),
    aggregationTypes: z.array(z.string()).optional(),
    transformations: z.array(z.string()).optional(),
    defaultAggregation: MetricDefaultAggregationSchema.optional(),
    dimensionDefinitions: z.array(MetricDimensionDefinitionSchema).optional(),
    dimensionCardinalities: z.array(MetricDimensionCardinalitySchema).optional(),
    metricValueType: MetricValueTypeSchema.optional(),
    created: z.number().optional(),
    lastWritten: z.number().optional(),
    latency: z.number().optional(),
    minimumValue: z.number().optional(),
    maximumValue: z.number().optional(),
    tags: z.array(z.string()).optional(),
    billable: z.boolean().optional(),
    dduBillable: z.boolean().optional(),
    resolutionInfSupported: z.boolean().optional(),
    rootCauseRelevant: z.boolean().optional(),
    scalar: z.boolean().optional(),
    metricSelector: z.string().optional()
});

const OutputSchema = MetricDescriptorSchema;

const action = createAction({
    description: 'Get the full descriptor (unit, dimensions, aggregation types) for a single metric.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['metrics.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.dynatrace.com/docs/dynatrace-api/environment-api/metric-v2/get-descriptor
            endpoint: `/api/v2/metrics/${encodeURIComponent(input.metricKey)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Metric descriptor not found',
                metricKey: input.metricKey
            });
        }

        const descriptor = MetricDescriptorSchema.parse(response.data);

        return descriptor;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
