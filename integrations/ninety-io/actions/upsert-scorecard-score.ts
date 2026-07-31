import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    kpiId: z.string().describe('The KPI ID. Example: "6a616ba843cee8f7e09d7e31"'),
    value: z.number().describe('The score value. Example: 8'),
    periodStartDate: z.string().describe('The period start date in ISO 8601 format. Example: "2026-01-01T00:00:00Z"')
});

const ProviderScoreSchema = z
    .object({
        _id: z.string(),
        measurableId: z.string(),
        periodStartDate: z.string(),
        value: z.number().optional(),
        note: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    kpiId: z.string(),
    periodStartDate: z.string(),
    value: z.number().optional(),
    note: z.string().optional()
});

const action = createAction({
    description: "Create or update a measurable's score for a period.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://help.ninety.io/en/articles/15505694-api-reference-and-access
            endpoint: `/v1/scorecard/kpis/${encodeURIComponent(input.kpiId)}/scores`,
            data: {
                value: input.value,
                periodStartDate: input.periodStartDate
            },
            retries: 3
        });

        const providerScore = ProviderScoreSchema.parse(response.data);

        return {
            id: providerScore._id,
            kpiId: providerScore.measurableId,
            periodStartDate: providerScore.periodStartDate,
            ...(providerScore.value !== undefined && { value: providerScore.value }),
            ...(providerScore.note !== undefined && { note: providerScore.note })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
