import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    metricSelector: z.string().optional().describe('Metric selector to filter metric keys. Example: "builtin:host.cpu.idle"'),
    text: z.string().optional().describe('Search term to filter metrics by key, display name, or description.'),
    cursor: z.string().optional().describe('Pagination cursor (nextPageKey) from the previous response. Omit for the first page.'),
    pageSize: z.number().int().min(1).max(500).optional().describe('Number of results per page. Max 500.')
});

const DefaultAggregationSchema = z.object({
    type: z.string().optional()
});

const DimensionDefinitionSchema = z.object({
    key: z.string().optional(),
    name: z.string().optional(),
    index: z.number().int().optional(),
    type: z.string().optional(),
    displayName: z.string().optional()
});

const MetricDescriptorSchema = z.object({
    metricId: z.string(),
    displayName: z.string().optional(),
    description: z.string().optional(),
    unit: z.string().optional(),
    entityType: z.array(z.string()).optional(),
    aggregationTypes: z.array(z.string()).optional(),
    transformations: z.array(z.string()).optional(),
    defaultAggregation: DefaultAggregationSchema.optional(),
    dimensionDefinitions: z.array(DimensionDefinitionSchema).optional(),
    dduBillable: z.boolean().optional(),
    created: z.number().optional(),
    lastWritten: z.number().optional(),
    tags: z.array(z.string()).optional(),
    metricValueType: z
        .object({
            type: z.string().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    metrics: z.array(MetricDescriptorSchema),
    nextPageKey: z.string().optional(),
    totalCount: z.number().int().optional(),
    warnings: z.array(z.string()).optional()
});

const action = createAction({
    description: 'List/search available metric keys.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['metrics.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.dynatrace.com/docs/dynatrace-api/environment-api/metric-v2/get-all-metrics
        const response = await nango.get({
            endpoint: '/api/v2/metrics',
            params: {
                ...(input.metricSelector !== undefined && { metricSelector: input.metricSelector }),
                ...(input.text !== undefined && { text: input.text }),
                ...(input.cursor !== undefined && { nextPageKey: input.cursor }),
                ...(input.pageSize !== undefined && { pageSize: String(input.pageSize) })
            },
            retries: 3
        });

        const rawResponseSchema = z.object({
            metrics: z.array(z.unknown()).optional(),
            nextPageKey: z.string().optional().nullable(),
            totalCount: z.number().optional(),
            warnings: z.array(z.unknown()).optional()
        });

        const rawParse = rawResponseSchema.safeParse(response.data);
        if (!rawParse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected an object response from Dynatrace metrics API.'
            });
        }

        const raw = rawParse.data;
        const rawMetrics = raw.metrics ?? [];
        const rawWarnings = raw.warnings ?? [];

        const parsedMetrics = rawMetrics
            .map((item: unknown) => {
                if (typeof item !== 'object' || item === null) {
                    return null;
                }
                const parsed = MetricDescriptorSchema.safeParse(item);
                if (!parsed.success) {
                    return null;
                }
                return parsed.data;
            })
            .filter((m: z.infer<typeof MetricDescriptorSchema> | null): m is z.infer<typeof MetricDescriptorSchema> => m !== null);

        return {
            metrics: parsedMetrics,
            ...(typeof raw.nextPageKey === 'string' && { nextPageKey: raw.nextPageKey }),
            ...(typeof raw.totalCount === 'number' && { totalCount: raw.totalCount }),
            warnings: rawWarnings.filter((w: unknown): w is string => typeof w === 'string')
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
