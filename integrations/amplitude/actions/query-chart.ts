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
 * Parses the CSV text Amplitude embeds in `{ data: "<csv>" }` for time-series chart types
 * (verified live 2026-09-25 against /api/3/chart/{chart_id}/csv — see gotcha #17/#21).
 * Expected shape: a few title/description/metric-name lines, a blank line, then a header row
 * whose first cell is "Segment" followed by one date per column, then one data row per segment.
 * Every cell is individually quoted and date/segment cells carry a leading tab character.
 * Returns undefined when the text doesn't match this layout (e.g. a non-time-series chart type).
 */
function parseAmplitudeChartCsv(csvText: string): { series: number[][]; seriesLabels: string[]; xValues: string[] } | undefined {
    const parseRow = (line: string): string[] => {
        const cells = line.match(/"(?:[^"]|"")*"|[^,]+/g) ?? [];
        return cells.map((cell) => cell.replace(/^"|"$/g, '').replace(/""/g, '"').replace(/^\t/, ''));
    };

    const lines = csvText.split(/\r\n|\n/).filter((line) => line.length > 0);

    let headerCells: string[] | undefined;
    const dataLines: string[] = [];
    for (const line of lines) {
        if (headerCells === undefined) {
            const cells = parseRow(line);
            if (cells[0]?.trim().toLowerCase() === 'segment') {
                headerCells = cells;
            }
            continue;
        }
        dataLines.push(line);
    }

    if (headerCells === undefined) {
        return undefined;
    }

    const xValues = headerCells.slice(1);
    const seriesLabels: string[] = [];
    const series: number[][] = [];

    for (const line of dataLines) {
        const cells = parseRow(line);
        if (cells.length === 0) {
            continue;
        }
        const [label, ...values] = cells;
        if (label === undefined) {
            continue;
        }
        seriesLabels.push(label);
        series.push(values.map((value) => Number(value)));
    }

    return { series, seriesLabels, xValues };
}

/**
 * @tags: [read]
 * @tagReason: Reads chart result data from an existing saved chart.
 * @pitfalls: Time-series/funnel chart types return CSV text embedded in a JSON string field rather than structured arrays — this is parsed into series/series_labels/x_values; inspect chart_data if the CSV layout doesn't match. Chart IDs cannot be discovered via API and must be copied from the Amplitude web app.
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

        const isRecord = (value: unknown): value is Record<string, unknown> => {
            return typeof value === 'object' && value !== null && !Array.isArray(value);
        };

        const unwrappedData = 'data' in responseData ? responseData['data'] : undefined;

        // Time-series/funnel chart types return { data: "<csv text>" } despite the JSON content-type
        // (see gotcha #17/#21) — parse the CSV into series/x_values instead of passing the raw text through.
        if (typeof unwrappedData === 'string') {
            const parsedCsv = parseAmplitudeChartCsv(unwrappedData);
            if (parsedCsv !== undefined) {
                return {
                    series: parsedCsv.series,
                    series_labels: parsedCsv.seriesLabels,
                    x_values: parsedCsv.xValues,
                    chart_data: responseData
                };
            }

            return { chart_data: responseData };
        }

        const chartPayload = unwrappedData !== undefined && isRecord(unwrappedData) ? unwrappedData : responseData;

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
            ...(seriesLabels !== undefined && { series_labels: seriesLabels.map((label) => String(label)) }),
            ...(xValues !== undefined && { x_values: xValues.map((value) => String(value)) }),
            chart_data: chartPayload
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
