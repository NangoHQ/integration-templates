import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    spreadsheet_id: z.string().describe('The ID of the Google Spreadsheet. Example: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"'),
    worksheet_name: z.string().describe('The name of the worksheet to delete. Example: "Sheet2"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    message: z.string()
});

const action = createAction({
    description: 'Delete a worksheet by name from a Google Spreadsheet',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/delete-worksheet',
        group: 'Worksheets'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // First, get spreadsheet metadata to find the sheet ID by name
        // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/get
        const metadataResponse = await nango.get({
            endpoint: `/v4/spreadsheets/${input.spreadsheet_id}`,
            retries: 3
        });

        const sheets = metadataResponse.data.sheets || [];
        const sheetToDelete = sheets.find((sheet: { properties: { title: string } }) => sheet.properties.title === input.worksheet_name);

        if (!sheetToDelete) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Worksheet "${input.worksheet_name}" not found in spreadsheet`,
                spreadsheet_id: input.spreadsheet_id,
                worksheet_name: input.worksheet_name
            });
        }

        const sheetId = sheetToDelete.properties.sheetId;

        // Delete the sheet using batchUpdate
        // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/batchUpdate
        await nango.post({
            endpoint: `/v4/spreadsheets/${input.spreadsheet_id}:batchUpdate`,
            data: {
                requests: [
                    {
                        deleteSheet: {
                            sheetId: sheetId
                        }
                    }
                ]
            },
            retries: 10
        });

        return {
            success: true,
            message: `Worksheet "${input.worksheet_name}" deleted successfully`
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
