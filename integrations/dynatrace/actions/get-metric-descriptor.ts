import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    metricKey: z.string().describe('The fully qualified key of the metric. Example: "builtin:host.cpu.usage"')
});

const MetricDefaultAggregationSchema = z.object({
    type: z.string().optional()
});

const MetricDimensionDefinitionSchema = z.object({
    key: z.string(),
    name: z.string(),
    displayName: z.string(),
    index: z.number(),
    type: z.string()
});

const MetricValueTypeSchema = z.object({
    type: z.string().optional()
});

const ProviderMetricDescriptorSchema = z.object({
    metricId: z.string().optional(),
    displayName: z.string().optional(),
    description: z.string().optional(),
    unit: z.string().optional(),
    dduBillable: z.boolean().optional(),
    created: z.number().optional(),
    lastWritten: z.number().optional(),
    entityType: z.array(z.string()).optional(),
    aggregationTypes: z.array(z.string()).optional(),
    transformations: z.array(z.string()).optional(),
    defaultAggregation: MetricDefaultAggregationSchema.optional(),
    dimensionDefinitions: z.array(MetricDimensionDefinitionSchema).optional(),
    tags: z.array(z.string()).optional(),
    metricValueType: MetricValueTypeSchema.optional(),
    scalar: z.boolean().optional(),
    resolutionInfSupported: z.boolean().optional()
});

const OutputSchema = z.object({
    metricId: z.string().optional(),
    displayName: z.string().optional(),
    description: z.string().optional(),
    unit: z.string().optional(),
    dduBillable: z.boolean().optional(),
    created: z.number().optional(),
    lastWritten: z.number().optional(),
    entityType: z.array(z.string()).optional(),
    aggregationTypes: z.array(z.string()).optional(),
    transformations: z.array(z.string()).optional(),
    defaultAggregation: MetricDefaultAggregationSchema.optional(),
    dimensionDefinitions: z.array(MetricDimensionDefinitionSchema).optional(),
    tags: z.array(z.string()).optional(),
    metricValueType: MetricValueTypeSchema.optional(),
    scalar: z.boolean().optional(),
    resolutionInfSupported: z.boolean().optional()
});

const action = createAction({
    description: 'Get the full descriptor (unit, dimensions, aggregation types) for a single metric.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['metrics.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.dynatrace.com/docs/dynatrace-api/environment-api/metric-v2/get-descriptor
        const response = await nango.get({
            endpoint: `/api/v2/metrics/${encodeURIComponent(input.metricKey)}`,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Metric descriptor not found',
                metricKey: input.metricKey
            });
        }

        const descriptor = ProviderMetricDescriptorSchema.parse(response.data);

        return {
            ...(descriptor.metricId !== undefined && { metricId: descriptor.metricId }),
            ...(descriptor.displayName !== undefined && { displayName: descriptor.displayName }),
            ...(descriptor.description !== undefined && { description: descriptor.description }),
            ...(descriptor.unit !== undefined && { unit: descriptor.unit }),
            ...(descriptor.dduBillable !== undefined && { dduBillable: descriptor.dduBillable }),
            ...(descriptor.created !== undefined && { created: descriptor.created }),
            ...(descriptor.lastWritten !== undefined && { lastWritten: descriptor.lastWritten }),
            ...(descriptor.entityType !== undefined && { entityType: descriptor.entityType }),
            ...(descriptor.aggregationTypes !== undefined && { aggregationTypes: descriptor.aggregationTypes }),
            ...(descriptor.transformations !== undefined && { transformations: descriptor.transformations }),
            ...(descriptor.defaultAggregation !== undefined && { defaultAggregation: descriptor.defaultAggregation }),
            ...(descriptor.dimensionDefinitions !== undefined && { dimensionDefinitions: descriptor.dimensionDefinitions }),
            ...(descriptor.tags !== undefined && { tags: descriptor.tags }),
            ...(descriptor.metricValueType !== undefined && { metricValueType: descriptor.metricValueType }),
            ...(descriptor.scalar !== undefined && { scalar: descriptor.scalar }),
            ...(descriptor.resolutionInfSupported !== undefined && { resolutionInfSupported: descriptor.resolutionInfSupported })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
