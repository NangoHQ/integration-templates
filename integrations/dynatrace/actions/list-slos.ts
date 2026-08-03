import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    pageSize: z.number().int().min(1).max(10000).optional().describe('The amount of SLOs in a single response payload. Maximum allowed is 10000.'),
    sloSelector: z.string().optional().describe('Filter SLOs by ID, name, health state, text, or management zone.'),
    sort: z.enum(['name', '-name']).optional().describe('Sort by name in ascending or descending order.'),
    enabledSlos: z.enum(['true', 'false', 'all']).optional().describe('Filter by enabled status: true, false, or all.'),
    evaluate: z.enum(['true', 'false']).optional().describe('Whether to evaluate SLOs. When true, maximum pageSize is 25.')
});

const SloBurnRateSchema = z.object({
    burnRateType: z.enum(['FAST', 'SLOW', 'NONE']).optional(),
    burnRateValue: z.number().optional(),
    burnRateVisualizationEnabled: z.boolean().optional(),
    estimatedTimeToConsumeErrorBudget: z.number().optional(),
    fastBurnThreshold: z.number().optional(),
    sloValue: z.number().optional()
});

const SloSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    enabled: z.boolean().optional(),
    status: z.enum(['FAILURE', 'SUCCESS', 'WARNING']).optional(),
    target: z.number().optional(),
    warning: z.number().optional(),
    evaluatedPercentage: z.number().optional(),
    errorBudget: z.number().optional(),
    error: z.string().optional(),
    timeframe: z.string().optional(),
    filter: z.string().optional(),
    metricExpression: z.string().optional(),
    metricName: z.string().optional(),
    metricKey: z.string().optional(),
    evaluationType: z.string().optional(),
    relatedOpenProblems: z.number().int().optional(),
    relatedTotalProblems: z.number().int().optional(),
    burnRateMetricKey: z.string().optional(),
    errorBudgetMetricKey: z.string().optional(),
    normalizedErrorBudgetMetricKey: z.string().optional(),
    metricDenominator: z.string().optional(),
    metricNumerator: z.string().optional(),
    metricRate: z.string().optional(),
    denominatorValue: z.number().optional(),
    numeratorValue: z.number().optional(),
    useRateMetric: z.boolean().optional(),
    problemFilters: z.array(z.string()).optional(),
    errorBudgetBurnRate: SloBurnRateSchema.optional()
});

const ProviderResponseSchema = z.object({
    nextPageKey: z.string().nullable().optional(),
    pageSize: z.number().int().optional(),
    totalCount: z.number().int().optional(),
    slo: z.array(SloSchema).optional()
});

const OutputSchema = z.object({
    items: z.array(SloSchema),
    nextPageKey: z.string().optional()
});

const action = createAction({
    description: 'List Service Level Objectives.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['slo.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};

        if (input.cursor !== undefined) {
            params['nextPageKey'] = input.cursor;
        }
        if (input.pageSize !== undefined) {
            params['pageSize'] = input.pageSize;
        }
        if (input.sloSelector !== undefined) {
            params['sloSelector'] = input.sloSelector;
        }
        if (input.sort !== undefined) {
            params['sort'] = input.sort;
        }
        if (input.enabledSlos !== undefined) {
            params['enabledSlos'] = input.enabledSlos;
        }
        if (input.evaluate !== undefined) {
            params['evaluate'] = input.evaluate;
        }

        // https://docs.dynatrace.com/docs/dynatrace-api/environment-api/service-level-objectives-classic/get-all
        const response = await nango.get({
            endpoint: '/api/v2/slo',
            params,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            items: parsed.slo ?? [],
            ...(parsed.nextPageKey != null && { nextPageKey: parsed.nextPageKey })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
