import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    kpiId: z.string().describe('The ID of the KPI. Example: "6a616ba843cee8f7e09d7e31"'),
    periodStartDate: z.string().describe('The period start date in ISO 8601 format. Example: "2026-01-01T00:00:00Z"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    kpiId: z.string(),
    periodStartDate: z.string()
});

const action = createAction({
    description: "Delete a measurable's note for a period.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://help.ninety.io/en/articles/15505694-api-reference-and-access
            endpoint: `/v1/scorecard/kpis/${encodeURIComponent(input.kpiId)}/notes/${encodeURIComponent(input.periodStartDate)}`,
            retries: 1
        });

        return {
            success: true,
            kpiId: input.kpiId,
            periodStartDate: input.periodStartDate
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
