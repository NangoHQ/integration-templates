import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the required SLO. Example: "123e4567-e89b-42d3-a456-556642440000"')
});

const SloBurnRateSchema = z.object({
    burnRateType: z.string().optional(),
    burnRateValue: z.number().optional(),
    burnRateVisualizationEnabled: z.boolean().optional(),
    estimatedTimeToConsumeErrorBudget: z.number().optional(),
    fastBurnThreshold: z.number().optional(),
    sloValue: z.number().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    enabled: z.boolean().optional(),
    evaluationType: z.string().optional(),
    filter: z.string().optional(),
    metricExpression: z.string().optional(),
    metricName: z.string().optional(),
    metricKey: z.string().optional(),
    errorBudgetMetricKey: z.string().optional(),
    burnRateMetricKey: z.string().optional(),
    normalizedErrorBudgetMetricKey: z.string().optional(),
    target: z.number().optional(),
    warning: z.number().optional(),
    timeframe: z.string().optional(),
    evaluatedPercentage: z.number().optional(),
    errorBudget: z.number().optional(),
    status: z.string().optional(),
    error: z.string().optional(),
    relatedOpenProblems: z.number().optional(),
    relatedTotalProblems: z.number().optional(),
    metricDenominator: z.string().optional(),
    metricNumerator: z.string().optional(),
    metricRate: z.string().optional(),
    useRateMetric: z.boolean().optional(),
    denominatorValue: z.number().optional(),
    numeratorValue: z.number().optional(),
    problemFilters: z.array(z.string()).optional(),
    errorBudgetBurnRate: SloBurnRateSchema.optional()
});

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

        const slo = z
            .object({
                id: z.string(),
                name: z.string().optional(),
                description: z.string().optional(),
                enabled: z.boolean().optional(),
                evaluationType: z.string().optional(),
                filter: z.string().optional(),
                metricExpression: z.string().optional(),
                metricName: z.string().optional(),
                metricKey: z.string().optional(),
                errorBudgetMetricKey: z.string().optional(),
                burnRateMetricKey: z.string().optional(),
                normalizedErrorBudgetMetricKey: z.string().optional(),
                target: z.number().optional(),
                warning: z.number().optional(),
                timeframe: z.string().optional(),
                evaluatedPercentage: z.number().optional(),
                errorBudget: z.number().optional(),
                status: z.string().optional(),
                error: z.string().optional(),
                relatedOpenProblems: z.number().optional(),
                relatedTotalProblems: z.number().optional(),
                metricDenominator: z.string().optional(),
                metricNumerator: z.string().optional(),
                metricRate: z.string().optional(),
                useRateMetric: z.boolean().optional(),
                denominatorValue: z.number().optional(),
                numeratorValue: z.number().optional(),
                problemFilters: z.array(z.string()).optional().nullable(),
                errorBudgetBurnRate: z
                    .object({
                        burnRateType: z.string().optional(),
                        burnRateValue: z.number().optional(),
                        burnRateVisualizationEnabled: z.boolean().optional(),
                        estimatedTimeToConsumeErrorBudget: z.number().optional(),
                        fastBurnThreshold: z.number().optional(),
                        sloValue: z.number().optional()
                    })
                    .optional()
                    .nullable()
            })
            .parse(response.data);

        return {
            id: slo.id,
            ...(slo.name !== undefined && { name: slo.name }),
            ...(slo.description !== undefined && { description: slo.description }),
            ...(slo.enabled !== undefined && { enabled: slo.enabled }),
            ...(slo.evaluationType !== undefined && { evaluationType: slo.evaluationType }),
            ...(slo.filter !== undefined && { filter: slo.filter }),
            ...(slo.metricExpression !== undefined && { metricExpression: slo.metricExpression }),
            ...(slo.metricName !== undefined && { metricName: slo.metricName }),
            ...(slo.metricKey !== undefined && { metricKey: slo.metricKey }),
            ...(slo.errorBudgetMetricKey !== undefined && { errorBudgetMetricKey: slo.errorBudgetMetricKey }),
            ...(slo.burnRateMetricKey !== undefined && { burnRateMetricKey: slo.burnRateMetricKey }),
            ...(slo.normalizedErrorBudgetMetricKey !== undefined && { normalizedErrorBudgetMetricKey: slo.normalizedErrorBudgetMetricKey }),
            ...(slo.target !== undefined && { target: slo.target }),
            ...(slo.warning !== undefined && { warning: slo.warning }),
            ...(slo.timeframe !== undefined && { timeframe: slo.timeframe }),
            ...(slo.evaluatedPercentage !== undefined && { evaluatedPercentage: slo.evaluatedPercentage }),
            ...(slo.errorBudget !== undefined && { errorBudget: slo.errorBudget }),
            ...(slo.status !== undefined && { status: slo.status }),
            ...(slo.error !== undefined && { error: slo.error }),
            ...(slo.relatedOpenProblems !== undefined && { relatedOpenProblems: slo.relatedOpenProblems }),
            ...(slo.relatedTotalProblems !== undefined && { relatedTotalProblems: slo.relatedTotalProblems }),
            ...(slo.metricDenominator !== undefined && { metricDenominator: slo.metricDenominator }),
            ...(slo.metricNumerator !== undefined && { metricNumerator: slo.metricNumerator }),
            ...(slo.metricRate !== undefined && { metricRate: slo.metricRate }),
            ...(slo.useRateMetric !== undefined && { useRateMetric: slo.useRateMetric }),
            ...(slo.denominatorValue !== undefined && { denominatorValue: slo.denominatorValue }),
            ...(slo.numeratorValue !== undefined && { numeratorValue: slo.numeratorValue }),
            ...(slo.problemFilters !== undefined && slo.problemFilters !== null && { problemFilters: slo.problemFilters }),
            ...(slo.errorBudgetBurnRate !== undefined && slo.errorBudgetBurnRate !== null && { errorBudgetBurnRate: slo.errorBudgetBurnRate })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
