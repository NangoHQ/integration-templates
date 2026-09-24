import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        chart_id: z.string().describe('The saved chart ID to query. Found in the chart URL in the Amplitude web app. Example: "abc123".')
    })
    .describe('Input to query an Amplitude chart by its saved chart ID.');

const OutputSchema = z
    .object({
        series: z
            .array(z.array(z.unknown()))
            .optional()
            .describe('Array of metric series, one per group. Each inner array contains values for each x-axis interval.'),
        series_meta: z.array(z.unknown()).optional().describe('Metadata labels for each series group, such as segment indices or region names.'),
        series_labels: z.array(z.string()).optional().describe('Human-readable labels for each series group.'),
        x_values: z.array(z.string()).optional().describe('X-axis values, typically dates in YYYY-MM-DD format or interval strings.'),
        chart_data: z.record(z.string(), z.unknown()).optional().describe('Complete chart response object when the provider returns a non-standard shape.')
    })
    .describe('Chart query result containing normalized series, metadata, and the raw provider payload.');

/**
 * @tags: [read]
 * @tagReason: Reads chart result data from an existing saved chart.
 * @pitfalls: Response format varies by chart type and may be CSV text inside JSON rather than structured arrays; inspect chart_data when normalized fields are absent. Chart IDs cannot be discovered via API and must be copied from the Amplitude web app.
 */
const action = createAction({
    description: 'Query a chart result by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const credentials = connection.credentials;

        let authHeader: string | undefined;
        if (credentials !== undefined && credentials.type === 'BASIC') {
            authHeader = 'Basic ' + Buffer.from(credentials.username + ':' + credentials.password).toString('base64');
        }

        const hostname = connection.connection_config !== undefined ? connection.connection_config['hostname'] : undefined;
        let baseUrlOverride: string | undefined;
        if (typeof hostname === 'string' && hostname.includes('eu.amplitude.com')) {
            baseUrlOverride = 'https://analytics.eu.amplitude.com';
        }

        const config: ProxyConfiguration = {
            // https://amplitude.com/docs/apis/analytics/dashboard-rest
            endpoint: `/api/3/chart/${encodeURIComponent(input.chart_id)}/csv`,
            ...(authHeader !== undefined && {
                headers: {
                    Authorization: authHeader
                }
            }),
            retries: 3
        };

        if (baseUrlOverride !== undefined) {
            config.baseUrlOverride = baseUrlOverride;
        }

        // https://amplitude.com/docs/apis/analytics/dashboard-rest
        const response = await nango.get(config);
        const responseData = response.data;

        if (typeof responseData !== 'object' || responseData === null) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Chart query returned an unexpected response format.',
                chart_id: input.chart_id
            });
        }

        const unwrappedData = 'data' in responseData ? responseData['data'] : undefined;
        const chartPayload = unwrappedData !== undefined && typeof unwrappedData === 'object' && unwrappedData !== null ? unwrappedData : responseData;

        if (typeof chartPayload !== 'object' || chartPayload === null) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Chart query returned an unexpected response format.',
                chart_id: input.chart_id
            });
        }

        const isRecord = (value: unknown): value is Record<string, unknown> => {
            return typeof value === 'object' && value !== null && !Array.isArray(value);
        };

        if (!isRecord(chartPayload)) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Chart query returned an unexpected response format.',
                chart_id: input.chart_id
            });
        }

        const series = 'series' in chartPayload && Array.isArray(chartPayload['series']) ? chartPayload['series'] : undefined;
        const seriesMeta = 'seriesMeta' in chartPayload && Array.isArray(chartPayload['seriesMeta']) ? chartPayload['seriesMeta'] : undefined;
        const seriesLabels = 'seriesLabels' in chartPayload && Array.isArray(chartPayload['seriesLabels']) ? chartPayload['seriesLabels'] : undefined;
        const xValues = 'xValues' in chartPayload && Array.isArray(chartPayload['xValues']) ? chartPayload['xValues'] : undefined;

        return {
            ...(series !== undefined && { series }),
            ...(seriesMeta !== undefined && { series_meta: seriesMeta }),
            ...(seriesLabels !== undefined && { series_labels: seriesLabels }),
            ...(xValues !== undefined && { x_values: xValues }),
            chart_data: chartPayload
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
