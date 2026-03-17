import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    spreadsheetId: z.string().describe('The ID of the spreadsheet to update. Example: "1aBcD..."'),
    range: z.string().describe('The A1 notation of the range to search for existing data and append to. Example: "Sheet1!A1:E" or "Sheet1"'),
    values: z.array(z.string()).describe('The row values to upsert. Example: ["Name", "Email", "Phone"]'),
    keyColumn: z.number().optional().describe('The column index (0-based) to use as the key for matching existing rows. If not provided, always appends.'),
    keyValue: z.string().optional().describe('The value to match in the key column for updating an existing row. Required if key_column is provided.')
});

const OutputSchema = z.object({
    success: z.boolean(),
    operation: z.enum(['appended', 'updated']),
    spreadsheetId: z.string(),
    updatedRange: z.string(),
    updatedRows: z.number()
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
        const { spreadsheetId, range, values, keyColumn, keyValue } = input;

        // If key_column is provided but key_value is missing, error
        if (keyColumn !== undefined && !keyValue) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'key_value is required when key_column is specified'
            });
        }

        // If we have a key_column, we need to search for the row first
        let rowIndex: number | null = null;

        if (keyColumn !== undefined && keyValue) {
            // Read the existing data to find the row
            // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/get
            const readResponse = await nango.get({
                endpoint: `/v4/spreadsheets/${spreadsheetId}/values/${range}`,
                retries: 3
            });

            if (readResponse.data && readResponse.data.values) {
                const rows: string[][] = readResponse.data.values;
                rowIndex = rows.findIndex((row) => row[keyColumn] === keyValue);
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
                endpoint: `/v4/spreadsheets/${spreadsheetId}/values/${updateRange}`,
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
                spreadsheetId: updateResponse.data.spreadsheetId,
                updatedRange: updateResponse.data.updatedRange,
                updatedRows: updateResponse.data.updatedRows
            };
        } else {
            // Append new row
            // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/append
            const appendResponse = await nango.post({
                endpoint: `/v4/spreadsheets/${spreadsheetId}/values/${range}:append`,
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
                spreadsheetId: appendResponse.data.spreadsheetId,
                updatedRange: appendResponse.data.updates?.updatedRange || '',
                updatedRows: appendResponse.data.updates?.updatedRows || 1
            };
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
