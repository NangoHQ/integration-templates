import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    spreadsheet_id: z.string().describe('The ID of the spreadsheet to update. Example: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"'),
    range: z.string().describe('The A1 notation of a range to search for a logical table of data. Example: "Sheet1!A1" or "Sheet1"'),
    values: z.array(z.any()).describe('The values to append to the spreadsheet. Each inner array represents a row of data.'),
    value_input_option: z
        .string()
        .optional()
        .describe(
            'How the input data should be interpreted. "RAW": The values will be parsed as if the user typed them into the UI. "USER_ENTERED": The values will be parsed as if the user typed them into the UI, but formulas will be calculated.'
        ),
    insert_data_option: z
        .string()
        .optional()
        .describe('How the input data should be inserted. "OVERWRITE": Overwrite existing data. "INSERT_ROWS": Insert new rows.'),
    major_dimension: z
        .string()
        .optional()
        .describe('The major dimension of the values. "ROWS": Values are organized by row. "COLUMNS": Values are organized by column.')
});

const OutputSchema = z.object({
    spreadsheet_id: z.string(),
    table_range: z.string(),
    updated_range: z.string(),
    updated_rows: z.number(),
    updated_columns: z.number(),
    updated_cells: z.number()
});

const action = createAction({
    description: 'Append values to the end of a spreadsheet table',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/append-values-to-spreadsheet',
        group: 'Sheets'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const valueInputOption = input.value_input_option ?? 'USER_ENTERED';
        const insertDataOption = input.insert_data_option ?? 'INSERT_ROWS';
        const majorDimension = input.major_dimension ?? 'ROWS';

        const response = await nango.post({
            // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/append
            endpoint: `/v4/spreadsheets/${input.spreadsheet_id}/values/${encodeURIComponent(input.range)}:append`,
            params: {
                valueInputOption: valueInputOption,
                insertDataOption: insertDataOption,
                includeValuesInResponse: 'true'
            },
            data: {
                values: input.values,
                majorDimension: majorDimension
            },
            retries: 3
        });

        const updates = response.data?.updates;

        if (!updates) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Google Sheets API: missing updates data'
            });
        }

        return {
            spreadsheet_id: response.data.spreadsheetId || input.spreadsheet_id,
            table_range: response.data.tableRange || '',
            updated_range: updates.updatedRange || '',
            updated_rows: updates.updatedRows || 0,
            updated_columns: updates.updatedColumns || 0,
            updated_cells: updates.updatedCells || 0
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
