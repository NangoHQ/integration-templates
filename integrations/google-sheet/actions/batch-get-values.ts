import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    spreadsheetId: z.string().describe('The ID of the spreadsheet to retrieve data from. Example: "1abc123xyz"'),
    ranges: z.array(z.string()).describe('The A1 notation or R1C1 notation of the ranges to retrieve values from. Example: ["Sheet1!A1:D5", "Sheet2!B2:C4"]'),
    majorDimension: z.enum(['ROWS', 'COLUMNS']).optional().describe('The major dimension that results should use. Defaults to ROWS.'),
    valueRenderOption: z.enum(['FORMATTED_VALUE', 'UNFORMATTED_VALUE', 'FORMULA']).optional().describe('How values should be rendered in the output.'),
    dateTimeRenderOption: z
        .enum(['SERIAL_NUMBER', 'FORMATTED_STRING'])
        .optional()
        .describe('How dates, times, and durations should be represented in the output.')
});

const ValueRangeSchema = z.object({
    range: z.string().describe('The range the values cover, in A1 notation.'),
    majorDimension: z.string().optional().describe('The major dimension of the values.'),
    values: z
        .array(z.array(z.any()))
        .optional()
        .describe('The data that was read. Array of arrays representing rows/columns, with each cell value being a string, number, boolean, or null.')
});

const OutputSchema = z.object({
    spreadsheetId: z.string().describe('The ID of the spreadsheet the data was retrieved from.'),
    valueRanges: z.array(ValueRangeSchema).describe('The values of the ranges requested.')
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

        if (input.majorDimension) {
            params['majorDimension'] = input.majorDimension;
        }

        if (input.valueRenderOption) {
            params['valueRenderOption'] = input.valueRenderOption;
        }

        if (input.dateTimeRenderOption) {
            params['dateTimeRenderOption'] = input.dateTimeRenderOption;
        }

        // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/batchGet
        const response = await nango.get({
            endpoint: `/v4/spreadsheets/${input.spreadsheetId}/values:batchGet`,
            params,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'No data found for the specified ranges',
                spreadsheetId: input.spreadsheetId,
                ranges: input.ranges
            });
        }

        const valueRanges = response.data.valueRanges || [];

        return {
            spreadsheetId: response.data.spreadsheetId,
            valueRanges: valueRanges.map((range: { range: string; majorDimension?: string; values?: unknown[][] }) => ({
                range: range.range,
                majorDimension: range.majorDimension,
                values: range.values
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
