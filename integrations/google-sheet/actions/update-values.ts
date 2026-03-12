import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    spreadsheet_id: z.string().describe('The ID of the spreadsheet to update. Example: "1abc123def456ghi"'),
    range: z.string().describe('The A1 notation of the values to update. Example: "Sheet1!A1:B2"'),
    values: z
        .array(z.array(z.any()))
        .describe('The data to write, as an array of arrays. Each inner array represents a row. Example: [["A1", "B1"], ["A2", "B2"]]'),
    value_input_option: z
        .union([z.literal('RAW'), z.literal('USER_ENTERED')])
        .optional()
        .describe('How the input data should be interpreted. RAW = values as-is, USER_ENTERED = parsed as if typed into the UI. Default: USER_ENTERED'),
    major_dimension: z
        .union([z.literal('ROWS'), z.literal('COLUMNS')])
        .optional()
        .describe('The major dimension of the values. ROWS = each inner array is a row, COLUMNS = each inner array is a column. Default: ROWS'),
    include_values_in_response: z.boolean().optional().describe('If true, the response includes the updated cell values. Default: false')
});

const OutputSchema = z.object({
    spreadsheet_id: z.string(),
    updated_range: z.string(),
    updated_rows: z.number(),
    updated_columns: z.number(),
    updated_cells: z.number()
});

const action = createAction({
    description: 'Update values in a spreadsheet range',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/update-values',
        group: 'Spreadsheets'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const valueInputOption = input.value_input_option ?? 'USER_ENTERED';
        const majorDimension = input.major_dimension ?? 'ROWS';
        const includeValuesInResponse = input.include_values_in_response ?? false;

        // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/update
        const response = await nango.put({
            endpoint: `/v4/spreadsheets/${input.spreadsheet_id}/values/${encodeURIComponent(input.range)}`,
            params: {
                valueInputOption,
                includeValuesInResponse: String(includeValuesInResponse),
                responseValueRenderOption: 'UNFORMATTED_VALUE'
            },
            data: {
                range: input.range,
                majorDimension,
                values: input.values
            },
            retries: 10
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'No response data from Google Sheets API'
            });
        }

        const result = response.data;

        return {
            spreadsheet_id: result.spreadsheetId,
            updated_range: result.updatedRange,
            updated_rows: result.updatedRows,
            updated_columns: result.updatedColumns,
            updated_cells: result.updatedCells
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
