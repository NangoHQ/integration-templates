import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    pageSize: z.number().int().min(1).max(10000).optional().describe('The number of SLOs per page. Max 10000.')
});

const SloBurnRateSchema = z.object({
    burnRateType: z.string().optional(),
    burnRateValue: z.number().optional(),
    burnRateVisualizationEnabled: z.boolean().optional(),
    estimatedTimeToConsumeErrorBudget: z.number().optional(),
    fastBurnThreshold: z.number().optional(),
    sloValue: z.number().optional()
});

const SloSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    enabled: z.boolean().optional(),
    evaluationType: z.string().optional(),
    filter: z.string().optional(),
    metricExpression: z.string().optional(),
    metricKey: z.string().optional(),
    metricName: z.string().optional(),
    target: z.number().optional(),
    warning: z.number().optional(),
    timeframe: z.string().optional(),
    status: z.string().optional(),
    evaluatedPercentage: z.number().optional(),
    error: z.string().optional(),
    errorBudget: z.number().optional(),
    errorBudgetBurnRate: SloBurnRateSchema.optional(),
    errorBudgetMetricKey: z.string().optional(),
    burnRateMetricKey: z.string().optional(),
    normalizedErrorBudgetMetricKey: z.string().optional(),
    relatedOpenProblems: z.number().int().optional(),
    relatedTotalProblems: z.number().int().optional(),
    denominatorValue: z.number().optional(),
    numeratorValue: z.number().optional(),
    metricDenominator: z.string().optional(),
    metricNumerator: z.string().optional(),
    metricRate: z.string().optional(),
    useRateMetric: z.boolean().optional(),
    problemFilters: z.array(z.string()).optional()
});

const OutputSchema = z.object({
    items: z.array(SloSchema),
    nextPageKey: z.string().optional(),
    totalCount: z.number().int().optional()
});

const ProviderSloResponseSchema = z.object({
    slo: z.array(z.unknown()).optional(),
    nextPageKey: z.string().nullable().optional(),
    pageSize: z.number().int().optional(),
    totalCount: z.number().int().optional()
});

const action = createAction({
    description: 'List Service Level Objectives.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['slo.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.dynatrace.com/docs/dynatrace-api/environment-api/service-level-objectives-classic/get-all
        const response = await nango.get({
            endpoint: '/api/v2/slo',
            params: {
                ...(input.cursor && { nextPageKey: input.cursor }),
                ...(input.pageSize && { pageSize: String(input.pageSize) })
            },
            retries: 3
        });

        const providerData = ProviderSloResponseSchema.parse(response.data);

        const items = (providerData.slo || []).map((item: unknown) => {
            const slo = SloSchema.parse(item);
            return slo;
        });

        return {
            items,
            ...(providerData.nextPageKey != null && { nextPageKey: providerData.nextPageKey }),
            ...(providerData.totalCount != null && { totalCount: providerData.totalCount })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
