import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    sourceSpreadsheetId: z.string().describe('The ID of the spreadsheet containing the sheet to copy. Example: "1aBcD..."'),
    sheetId: z.number().describe('The ID of the sheet to copy. Example: 123456789'),
    destinationSpreadsheetId: z.string().describe('The ID of the spreadsheet to copy the sheet to. Example: "2xYzA..."')
});

const OutputSchema = z.object({
    sheetId: z.number().describe('The ID of the newly copied sheet'),
    title: z.string().describe('The title of the newly copied sheet'),
    index: z.number().describe('The zero-based index of the sheet within the spreadsheet'),
    sheetType: z.string().describe('The type of sheet (GRID, OBJECT, etc.)'),
    rowCount: z.number().optional().describe('The number of rows in the grid, if applicable'),
    columnCount: z.number().optional().describe('The number of columns in the grid, if applicable')
});

const action = createAction({
    description: 'Copy a sheet to another spreadsheet',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/copy-sheet',
        group: 'Sheets'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.sheets/copyTo
            endpoint: `/v4/spreadsheets/${input.sourceSpreadsheetId}/sheets/${input.sheetId}:copyTo`,
            data: {
                destinationSpreadsheetId: input.destinationSpreadsheetId
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'copy_failed',
                message: 'Failed to copy sheet',
                sourceSpreadsheetId: input.sourceSpreadsheetId,
                sheetId: input.sheetId,
                destinationSpreadsheetId: input.destinationSpreadsheetId
            });
        }

        const properties = response.data;

        return {
            sheetId: properties.sheetId,
            title: properties.title,
            index: properties.index,
            sheetType: properties.sheetType,
            rowCount: properties.gridProperties?.rowCount,
            columnCount: properties.gridProperties?.columnCount
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
