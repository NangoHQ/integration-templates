import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    spreadsheetId: z.string().describe('The ID of the spreadsheet to update. Example: "1abc123def456ghi"'),
    range: z.string().describe('The A1 notation of the values to update. Example: "Sheet1!A1:B2"'),
    values: z
        .array(z.array(z.any()))
        .describe('The data to write, as an array of arrays. Each inner array represents a row. Example: [["A1", "B1"], ["A2", "B2"]]'),
    valueInputOption: z
        .union([z.literal('RAW'), z.literal('USER_ENTERED')])
        .optional()
        .describe('How the input data should be interpreted. RAW = values as-is, USER_ENTERED = parsed as if typed into the UI. Default: USER_ENTERED'),
    majorDimension: z
        .union([z.literal('ROWS'), z.literal('COLUMNS')])
        .optional()
        .describe('The major dimension of the values. ROWS = each inner array is a row, COLUMNS = each inner array is a column. Default: ROWS'),
    includeValuesInResponse: z.boolean().optional().describe('If true, the response includes the updated cell values. Default: false')
});

const OutputSchema = z.object({
    spreadsheetId: z.string(),
    updatedRange: z.string(),
    updatedRows: z.number(),
    updatedColumns: z.number(),
    updatedCells: z.number()
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
        const valueInputOption = input.valueInputOption ?? 'USER_ENTERED';
        const majorDimension = input.majorDimension ?? 'ROWS';
        const includeValuesInResponse = input.includeValuesInResponse ?? false;

        // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/update
        const response = await nango.put({
            endpoint: `/v4/spreadsheets/${input.spreadsheetId}/values/${encodeURIComponent(input.range)}`,
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
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'No response data from Google Sheets API'
            });
        }

        const result = response.data;

        return {
            spreadsheetId: result.spreadsheetId,
            updatedRange: result.updatedRange,
            updatedRows: result.updatedRows,
            updatedColumns: result.updatedColumns,
            updatedCells: result.updatedCells
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
