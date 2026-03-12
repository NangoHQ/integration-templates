import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    spreadsheet_id: z.string().describe('The ID of the spreadsheet to update. Example: "1aBcD..."'),
    range: z.string().describe('The A1 notation of the range to search for existing data and append to. Example: "Sheet1!A1:E" or "Sheet1"'),
    values: z.array(z.string()).describe('The row values to upsert. Example: ["Name", "Email", "Phone"]'),
    key_column: z.number().optional().describe('The column index (0-based) to use as the key for matching existing rows. If not provided, always appends.'),
    key_value: z.string().optional().describe('The value to match in the key column for updating an existing row. Required if key_column is provided.')
});

const OutputSchema = z.object({
    success: z.boolean(),
    operation: z.enum(['appended', 'updated']),
    spreadsheet_id: z.string(),
    updated_range: z.string(),
    updated_rows: z.number()
});

const action = createAction({
    description: 'Append or update a row of values in a Google Sheet',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/upsert-row',
        group: 'Sheets'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const { spreadsheet_id, range, values, key_column, key_value } = input;

        // If key_column is provided but key_value is missing, error
        if (key_column !== undefined && !key_value) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'key_value is required when key_column is specified'
            });
        }

        // If we have a key_column, we need to search for the row first
        let rowIndex: number | null = null;

        if (key_column !== undefined && key_value) {
            // Read the existing data to find the row
            // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/get
            const readResponse = await nango.get({
                endpoint: `/v4/spreadsheets/${spreadsheet_id}/values/${range}`,
                retries: 3
            });

            if (readResponse.data && readResponse.data.values) {
                const rows: string[][] = readResponse.data.values;
                rowIndex = rows.findIndex((row) => row[key_column] === key_value);
            }
        }

        if (rowIndex !== null && rowIndex >= 0) {
            // Update existing row
            // We need to construct the specific cell range for this row
            // Extract sheet name from range (e.g., "Sheet1!A1:E" -> "Sheet1")
            const sheetName = range.includes('!') ? range.split('!')[0] : range;
            // Calculate the row number (rowIndex is 0-based in values array, but sheets are 1-based)
            const rowNumber = rowIndex + 1;
            // Construct range like "Sheet1!A3:E3" for row 3
            const startCol = 'A';
            const endCol = String.fromCharCode(65 + values.length - 1); // A + (length - 1)
            const updateRange = `${sheetName}!${startCol}${rowNumber}:${endCol}${rowNumber}`;

            // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/update
            const updateResponse = await nango.put({
                endpoint: `/v4/spreadsheets/${spreadsheet_id}/values/${updateRange}`,
                params: {
                    valueInputOption: 'USER_ENTERED'
                },
                data: {
                    range: updateRange,
                    majorDimension: 'ROWS',
                    values: [values]
                },
                retries: 3
            });

            return {
                success: true,
                operation: 'updated',
                spreadsheet_id: updateResponse.data.spreadsheetId,
                updated_range: updateResponse.data.updatedRange,
                updated_rows: updateResponse.data.updatedRows
            };
        } else {
            // Append new row
            // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/append
            const appendResponse = await nango.post({
                endpoint: `/v4/spreadsheets/${spreadsheet_id}/values/${range}:append`,
                params: {
                    valueInputOption: 'USER_ENTERED',
                    insertDataOption: 'INSERT_ROWS'
                },
                data: {
                    range: range,
                    majorDimension: 'ROWS',
                    values: [values]
                },
                retries: 3
            });

            return {
                success: true,
                operation: 'appended',
                spreadsheet_id: appendResponse.data.spreadsheetId,
                updated_range: appendResponse.data.updates?.updatedRange || '',
                updated_rows: appendResponse.data.updates?.updatedRows || 1
            };
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
