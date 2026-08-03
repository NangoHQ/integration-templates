import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the SLO to retrieve. Example: "914c8d1f-7d24-36e9-986a-df7ebf95b741"')
});

const SloBurnRateSchema = z.object({
    burnRateType: z.string().optional(),
    burnRateValue: z.number().optional(),
    burnRateVisualizationEnabled: z.boolean(),
    estimatedTimeToConsumeErrorBudget: z.number().optional(),
    fastBurnThreshold: z.number().optional(),
    sloValue: z.number().optional()
});

const ProviderSloSchema = z.object({
    id: z.string(),
    enabled: z.boolean(),
    name: z.string(),
    description: z.string().optional(),
    evaluatedPercentage: z.number(),
    errorBudget: z.number(),
    status: z.string(),
    error: z.string(),
    errorBudgetBurnRate: SloBurnRateSchema,
    metricName: z.string(),
    metricKey: z.string(),
    burnRateMetricKey: z.string(),
    errorBudgetMetricKey: z.string(),
    normalizedErrorBudgetMetricKey: z.string(),
    metricExpression: z.string().optional(),
    target: z.number(),
    warning: z.number(),
    evaluationType: z.string(),
    timeframe: z.string(),
    filter: z.string().optional(),
    relatedOpenProblems: z.number().optional(),
    relatedTotalProblems: z.number().optional(),
    denominatorValue: z.number().optional(),
    numeratorValue: z.number().optional(),
    metricRate: z.string().optional(),
    useRateMetric: z.boolean().optional(),
    metricNumerator: z.string().optional(),
    metricDenominator: z.string().optional()
});

const OutputSchema = ProviderSloSchema;

const action = createAction({
    description: 'Get full details of a single SLO.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['slo.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.dynatrace.com/docs/dynatrace-api/environment-api/service-level-objectives-classic/get-slo
            endpoint: `/api/v2/slo/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'SLO not found',
                id: input.id
            });
        }

        const slo = ProviderSloSchema.parse(response.data);

        return slo;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
