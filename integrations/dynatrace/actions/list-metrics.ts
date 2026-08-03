import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    metricSelector: z.string().optional().describe('Metric selector filter. Example: "builtin:host.cpu.usage"'),
    text: z.string().optional().describe('Text search filter for metric keys'),
    cursor: z.string().optional().describe('Pagination cursor (nextPageKey) from the previous response. Omit for the first page.'),
    pageSize: z.number().int().min(1).optional().describe('Page size for results. Defaults to API default.')
});

const MetricDefaultAggregationSchema = z.object({
    type: z.string().optional()
});

const MetricDimensionDefinitionSchema = z.object({
    key: z.string().optional(),
    name: z.string().optional(),
    displayName: z.string().optional(),
    index: z.number().optional(),
    type: z.string().optional()
});

const MetricValueTypeSchema = z.object({
    type: z.string().optional()
});

const MetricSchema = z.object({
    metricId: z.string(),
    displayName: z.string().optional(),
    description: z.string().optional(),
    unit: z.string().optional(),
    entityType: z.array(z.string()).optional(),
    aggregationTypes: z.array(z.string()).optional(),
    transformations: z.array(z.string()).optional(),
    defaultAggregation: MetricDefaultAggregationSchema.optional(),
    dimensionDefinitions: z.array(MetricDimensionDefinitionSchema).optional(),
    tags: z.array(z.string()).optional(),
    metricValueType: MetricValueTypeSchema.optional(),
    created: z.number().optional(),
    lastWritten: z.number().optional(),
    dduBillable: z.boolean().optional(),
    billable: z.boolean().optional(),
    latency: z.number().optional(),
    minimumValue: z.number().optional(),
    maximumValue: z.number().optional(),
    impactRelevant: z.boolean().optional(),
    rootCauseRelevant: z.boolean().optional(),
    scalar: z.boolean().optional(),
    resolutionInfSupported: z.boolean().optional(),
    warnings: z.array(z.string()).optional()
});

const OutputSchema = z.object({
    items: z.array(MetricSchema),
    nextPageKey: z.string().optional(),
    totalCount: z.number().optional(),
    warnings: z.array(z.string()).optional()
});

const action = createAction({
    description: 'List/search available metric keys',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['metrics.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Dynatrace requires nextPageKey to be sent alone on continuation requests; filters/pageSize are only valid on the first page.
        const params: Record<string, string> = input.cursor
            ? { nextPageKey: input.cursor }
            : {
                  ...(input.metricSelector !== undefined && { metricSelector: input.metricSelector }),
                  ...(input.text !== undefined && { text: input.text }),
                  ...(input.pageSize !== undefined && { pageSize: String(input.pageSize) })
              };

        const response = await nango.get({
            // https://docs.dynatrace.com/docs/dynatrace-api/environment-api/metric-v2/get-all-metrics
            endpoint: '/api/v2/metrics',
            params,
            retries: 3
        });

        const providerResponse = z
            .object({
                metrics: z.array(z.unknown()).optional(),
                nextPageKey: z.string().nullable().optional(),
                totalCount: z.number().optional(),
                warnings: z.array(z.string()).optional()
            })
            .parse(response.data);

        const items = (providerResponse.metrics ?? []).map((metric) => {
            const parsed = MetricSchema.safeParse(metric);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'parse_error',
                    message: 'Failed to parse metric descriptor',
                    details: parsed.error.message
                });
            }
            return parsed.data;
        });

        return {
            items,
            ...(providerResponse.nextPageKey != null && { nextPageKey: providerResponse.nextPageKey }),
            ...(providerResponse.totalCount !== undefined && { totalCount: providerResponse.totalCount }),
            ...(providerResponse.warnings !== undefined && { warnings: providerResponse.warnings })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
