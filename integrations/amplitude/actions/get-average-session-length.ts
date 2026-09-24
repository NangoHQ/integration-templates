import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        start: z.string().describe('First date included in data series, formatted YYYYMMDD. Example: "20240101"'),
        end: z.string().describe('Last date included in data series, formatted YYYYMMDD. Example: "20240107"')
    })
    .describe('Input to get average session length per day for a date range.');

const ProviderDataSchema = z.object({
    data: z.object({
        series: z.array(z.array(z.number())),
        seriesMeta: z.array(z.object({ segmentIndex: z.number().optional() }).passthrough()).optional(),
        xValues: z.array(z.string())
    })
});

const DailyValueSchema = z.object({
    date: z.string().describe('Date in YYYY-MM-DD format.'),
    average_session_length_seconds: z.number().describe('Average session length in seconds for this date.')
});

const OutputSchema = z
    .object({
        daily_values: z.array(DailyValueSchema).describe('Average session length per day for the requested range.')
    })
    .describe('Output containing the average session length in seconds for each day in the requested range.');

/**
 * @tags: [read]
 * @tagReason: Reads average session length metrics from the Amplitude Dashboard REST API.
 * @pitfalls: Dates before the project's retention cutoff return 403, and returned date strings include a "T00:00:00" suffix despite documentation showing plain YYYY-MM-DD.
 */
const action = createAction({
    description: 'Get average session length in seconds per day.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://amplitude.com/docs/apis/analytics/dashboard-rest#get-average-session-length
        const response = await nango.get({
            endpoint: '/api/2/sessions/average',
            params: {
                start: input.start,
                end: input.end
            },
            retries: 3
        });

        const parsed = ProviderDataSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from Amplitude sessions/average endpoint.',
                details: parsed.error.message
            });
        }

        const data = parsed.data.data;
        const dailyValues: z.infer<typeof DailyValueSchema>[] = [];

        for (let dayIndex = 0; dayIndex < data.xValues.length; dayIndex++) {
            const date = data.xValues[dayIndex];
            if (date === undefined) {
                continue;
            }
            let value = 0;

            for (let seriesIndex = 0; seriesIndex < data.series.length; seriesIndex++) {
                const seriesValues = data.series[seriesIndex];
                if (seriesValues && dayIndex < seriesValues.length) {
                    const maybeValue = seriesValues[dayIndex];
                    if (maybeValue !== undefined) {
                        value = maybeValue;
                        break;
                    }
                }
            }

            dailyValues.push({
                date,
                average_session_length_seconds: value
            });
        }

        return {
            daily_values: dailyValues
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
