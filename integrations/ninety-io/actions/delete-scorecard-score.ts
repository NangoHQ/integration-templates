import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    kpiId: z.string().describe('The ID of the KPI whose score should be deleted. Example: "6a616ba843cee8f7e09d7e31"'),
    periodStartDate: z
        .string()
        .describe(
            'The ISO 8601 start date of the period whose score should be deleted. Must exactly match the date used when the score was created. Example: "2025-01-01T00:00:00Z"'
        )
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: "Delete a measurable's score for a period.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://help.ninety.io/en/articles/15505694-api-reference-and-access
        await nango.delete({
            endpoint: `/v1/scorecard/kpis/${encodeURIComponent(input.kpiId)}/scores/${encodeURIComponent(input.periodStartDate)}`,
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
