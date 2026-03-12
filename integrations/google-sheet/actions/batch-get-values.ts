import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    spreadsheet_id: z.string().describe('The ID of the spreadsheet to retrieve data from. Example: "1abc123xyz"'),
    ranges: z.array(z.string()).describe('The A1 notation or R1C1 notation of the ranges to retrieve values from. Example: ["Sheet1!A1:D5", "Sheet2!B2:C4"]'),
    major_dimension: z.enum(['ROWS', 'COLUMNS']).optional().describe('The major dimension that results should use. Defaults to ROWS.'),
    value_render_option: z.enum(['FORMATTED_VALUE', 'UNFORMATTED_VALUE', 'FORMULA']).optional().describe('How values should be rendered in the output.'),
    date_time_render_option: z
        .enum(['SERIAL_NUMBER', 'FORMATTED_STRING'])
        .optional()
        .describe('How dates, times, and durations should be represented in the output.')
});

const ValueRangeSchema = z.object({
    range: z.string().describe('The range the values cover, in A1 notation.'),
    major_dimension: z.string().optional().describe('The major dimension of the values.'),
    values: z
        .array(z.array(z.any()))
        .optional()
        .describe('The data that was read. Array of arrays representing rows/columns, with each cell value being a string, number, boolean, or null.')
});

const OutputSchema = z.object({
    spreadsheet_id: z.string().describe('The ID of the spreadsheet the data was retrieved from.'),
    value_ranges: z.array(ValueRangeSchema).describe('The values of the ranges requested.')
});

const action = createAction({
    description: 'Get values from multiple ranges',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/actions/batch-get-values',
        group: 'Spreadsheets'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | string[]> = {};

        if (input.ranges && input.ranges.length > 0) {
            params['ranges'] = input.ranges;
        }

        if (input.major_dimension) {
            params['majorDimension'] = input.major_dimension;
        }

        if (input.value_render_option) {
            params['valueRenderOption'] = input.value_render_option;
        }

        if (input.date_time_render_option) {
            params['dateTimeRenderOption'] = input.date_time_render_option;
        }

        // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/batchGet
        const response = await nango.get({
            endpoint: `/v4/spreadsheets/${input.spreadsheet_id}/values:batchGet`,
            params,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'No data found for the specified ranges',
                spreadsheet_id: input.spreadsheet_id,
                ranges: input.ranges
            });
        }

        const valueRanges = response.data.valueRanges || [];

        return {
            spreadsheet_id: response.data.spreadsheetId,
            value_ranges: valueRanges.map((range: { range: string; majorDimension?: string; values?: unknown[][] }) => ({
                range: range.range,
                major_dimension: range.majorDimension,
                values: range.values
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
