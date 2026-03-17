import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    spreadsheetId: z.string().describe('The ID of the spreadsheet to update. Example: "1a2b3c4d5e6f7g8h9i0j"'),
    range: z.string().describe('The A1 notation or R1C1 notation of the values to clear. Example: "Sheet1!A1:D10"')
});

const OutputSchema = z.object({
    spreadsheetId: z.string(),
    clearedRange: z.string()
});

const action = createAction({
    description: 'Clear values from a range, preserving formatting',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/clear-values',
        group: 'Values'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/clear
        const response = await nango.post({
            endpoint: `v4/spreadsheets/${input.spreadsheetId}/values/${encodeURIComponent(input.range)}:clear`,
            data: {},
            retries: 3
        });

        return {
            spreadsheetId: response.data.spreadsheetId,
            clearedRange: response.data.clearedRange
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
