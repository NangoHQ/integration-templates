import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    spreadsheet_id: z.string().describe('The ID of the spreadsheet to retrieve data from. Example: "1aBcD..."'),
    range: z.string().describe('The A1 notation or R1C1 notation of the range to retrieve values from. Example: "Sheet1!A1:C10" or "Sheet1"')
});

const OutputSchema = z.object({
    spreadsheet_id: z.string(),
    range: z.string(),
    major_dimension: z.enum(['ROWS', 'COLUMNS']),
    values: z.any().describe('The data values in the range, as a 2D array where each inner array represents a row')
});

const action = createAction({
    description: 'Get values from a spreadsheet range',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/get-values',
        group: 'Sheets'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/get
        const response = await nango.get({
            endpoint: `/v4/spreadsheets/${encodeURIComponent(input.spreadsheet_id)}/values/${encodeURIComponent(input.range)}`,
            retries: 3
        });

        const data = response.data;

        // Google Sheets API returns camelCase field names
        const spreadsheetId = data.spreadsheetId || data.spreadsheet_id || input.spreadsheet_id;
        const range = data.range || input.range;
        const majorDimension = data.majorDimension || 'ROWS';
        const values = data.values || [];

        return {
            spreadsheet_id: spreadsheetId,
            range: range,
            major_dimension: majorDimension,
            values: values
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
