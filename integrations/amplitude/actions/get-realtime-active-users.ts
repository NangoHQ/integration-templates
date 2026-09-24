import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({}).describe('No input required. The endpoint always returns the trailing 2-day window at 5-minute granularity.');

const DataPointSchema = z.object({
    time: z.string().describe('Time interval in HH:mm format.'),
    today_count: z.number().describe('Active user count for today at this interval.'),
    yesterday_count: z.number().describe('Active user count for yesterday at this interval.')
});

const OutputSchema = z
    .object({
        data_points: z.array(DataPointSchema).describe('Active user counts at 5-minute intervals for today and yesterday.')
    })
    .describe('Realtime active user counts at 5-minute granularity for today and yesterday.');

const ProviderResponseSchema = z.object({
    data: z.object({
        xValues: z.array(z.string()),
        seriesLabels: z.array(z.string()),
        series: z.array(z.array(z.number()))
    })
});

/**
 * @tags: [read]
 * @tagReason: Reads realtime active user counts from the Amplitude Dashboard REST API.
 * @pitfalls: The Dashboard REST API time zone matches your Amplitude project's time zone, so returned HH:mm intervals reflect that zone rather than UTC.
 */
const action = createAction({
    description: 'Get active user counts at 5-minute granularity for the last two days.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const hostname = connection.connection_config?.['hostname'];
        const baseUrlOverride = hostname === 'analytics.eu.amplitude.com' ? 'https://analytics.eu.amplitude.com' : undefined;

        const response = await nango.get({
            // https://amplitude.com/docs/apis/analytics/dashboard-rest
            endpoint: '/api/2/realtime',
            params: {
                i: 5
            },
            baseUrlOverride,
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);
        const xValues = providerData.data.xValues;

        const dataPoints = xValues.map((time, index) => ({
            time,
            today_count: providerData.data.series[0]?.[index] ?? 0,
            yesterday_count: providerData.data.series[1]?.[index] ?? 0
        }));

        return {
            data_points: dataPoints
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
