import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    spreadsheetId: z.string().describe('The ID of the spreadsheet to update. Example: "1a2b3c4d5e6f"'),
    ranges: z.array(z.string()).describe('The ranges to clear, in A1 notation. Example: ["Sheet1!A1:D10", "Sheet2!B2:C5"]')
});

const OutputSchema = z.object({
    spreadsheetId: z.string().describe('The ID of the spreadsheet'),
    clearedRanges: z.array(z.string()).describe('The ranges that were cleared, in A1 notation')
});

const action = createAction({
    description: 'Clear values from one or more ranges in a spreadsheet, preserving formatting',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/batch-clear-values',
        group: 'Values'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/batchClear
        const response = await nango.post({
            endpoint: `/v4/spreadsheets/${input.spreadsheetId}/values:batchClear`,
            data: {
                ranges: input.ranges
            },
            retries: 3
        });

        return {
            spreadsheetId: response.data.spreadsheetId || input.spreadsheetId,
            clearedRanges: response.data.clearedRanges || []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
