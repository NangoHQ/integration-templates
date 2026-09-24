import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        start: z.string().describe('First date included in the data series, formatted as YYYYMMDD. Example: "20221001".'),
        end: z.string().describe('Last date included in the data series, formatted as YYYYMMDD. Example: "20221001".'),
        timeHistogramConfigBinTimeUnit: z
            .enum(['hours', 'minutes', 'seconds'])
            .optional()
            .describe('Time unit for custom bucket sizes. Omit to use Amplitude default bins.'),
        timeHistogramConfigBinMin: z
            .number()
            .optional()
            .describe('Minimum value for custom bucketing, as a number. Must be provided with timeHistogramConfigBinTimeUnit and timeHistogramConfigBinMax.'),
        timeHistogramConfigBinMax: z
            .number()
            .optional()
            .describe('Maximum value for custom bucketing, as a number. Must be provided with timeHistogramConfigBinTimeUnit and timeHistogramConfigBinMin.'),
        timeHistogramConfigBinSize: z.number().optional().describe('Size of each custom bucket, as a number. Omit to let Amplitude choose the best bin sizing.')
    })
    .describe('Input parameters for retrieving the session length distribution for a date range.');

const ProviderResponseSchema = z.object({
    data: z.object({
        series: z.array(z.array(z.number())),
        xValues: z.array(z.string())
    })
});

const OutputSchema = z
    .object({
        series: z.array(z.array(z.number())).describe('An array containing one array with the session counts for each bucket.'),
        xValues: z
            .array(z.string())
            .describe('An array of session length interval strings (buckets), formatted as "[bucketStartInSeconds]s-[bucketEndInSeconds]s".')
    })
    .describe('Session length distribution response with session counts per predefined length bucket.');

/**
 * @tags: [read]
 * @tagReason: Reads session length distribution analytics data from the Amplitude Dashboard REST API.
 * @pitfalls: The API enforces a rolling cutoff date and returns 403 for older date ranges; even valid recent ranges may return empty series and xValues when no sessions exist.
 */
const action = createAction({
    description: 'Get session counts bucketed by predefined length periods.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const hostname = connection.connection_config?.['hostname'];
        const baseUrlOverride = hostname === 'analytics.eu.amplitude.com' ? 'https://analytics.eu.amplitude.com' : undefined;

        const params: Record<string, string | number> = {
            start: input.start,
            end: input.end
        };

        if (input['timeHistogramConfigBinTimeUnit'] !== undefined) {
            params['timeHistogramConfigBinTimeUnit'] = input['timeHistogramConfigBinTimeUnit'];
        }
        if (input['timeHistogramConfigBinMin'] !== undefined) {
            params['timeHistogramConfigBinMin'] = input['timeHistogramConfigBinMin'];
        }
        if (input['timeHistogramConfigBinMax'] !== undefined) {
            params['timeHistogramConfigBinMax'] = input['timeHistogramConfigBinMax'];
        }
        if (input['timeHistogramConfigBinSize'] !== undefined) {
            params['timeHistogramConfigBinSize'] = input['timeHistogramConfigBinSize'];
        }

        // https://amplitude.com/docs/apis/analytics/dashboard-rest#get-session-length-distribution
        const response = await nango.get({
            endpoint: '/api/2/sessions/length',
            baseUrlOverride,
            params,
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'The Amplitude API returned an unexpected response shape.',
                details: parsed.error.message
            });
        }

        return {
            series: parsed.data.data.series,
            xValues: parsed.data.data.xValues
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
